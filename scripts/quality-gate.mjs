// Local quality gate: runs typecheck and tests for every project in projects/
// and a secrets scan over the whole repository.
// Run: node scripts/quality-gate.mjs [all|typecheck|test|secrets]

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const projectsDir = join(root, "projects");

const MODES = new Set(["all", "typecheck", "test", "secrets"]);
const mode = process.argv[2] ?? "all";

if (!MODES.has(mode)) {
  console.error(`quality gate: unknown mode "${mode}"`);
  process.exit(2);
}

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

function run(cmd, args, cwd, useShell = process.platform === "win32") {
  if (useShell && process.platform === "win32") {
    const comSpec = process.env.ComSpec ?? "cmd.exe";
    execFileSync(comSpec, ["/d", "/s", "/c", [cmd, ...args].join(" ")], {
      cwd,
      stdio: "inherit",
    });
    return;
  }
  execFileSync(cmd, args, { cwd, stdio: "inherit" });
}

function listProjects() {
  if (!existsSync(projectsDir)) return [];
  return readdirSync(projectsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(projectsDir, entry.name))
    .filter((dir) => existsSync(join(dir, "package.json")))
    .sort();
}

function hasScript(projectDir, name) {
  try {
    const pkg = JSON.parse(readFileSync(join(projectDir, "package.json"), "utf8"));
    return Boolean(pkg.scripts && pkg.scripts[name]);
  } catch {
    return false;
  }
}

function ensureDeps(projectDir) {
  if (existsSync(join(projectDir, "node_modules"))) return;
  const lock = join(projectDir, "package-lock.json");
  console.log(`quality gate: installing dependencies for ${projectDir}`);
  if (existsSync(lock)) {
    run(npmCmd, ["ci", "--no-audit", "--no-fund"], projectDir);
  } else {
    run(npmCmd, ["install", "--no-audit", "--no-fund"], projectDir);
  }
}

function main() {
  const projects = listProjects();
  let failed = false;

  if (projects.length === 0) {
    console.log("quality gate: no projects discovered yet under projects/");
  }

  if (mode === "all" || mode === "typecheck") {
    for (const project of projects) {
      if (!hasScript(project, "typecheck")) {
        console.log(`quality gate: ${project} has no typecheck script, skipping`);
        continue;
      }
      ensureDeps(project);
      console.log(`quality gate: typecheck ${project}`);
      try {
        run(npmCmd, ["run", "typecheck"], project);
      } catch {
        failed = true;
      }
    }
  }

  if (mode === "all" || mode === "test") {
    for (const project of projects) {
      if (!hasScript(project, "test")) {
        console.log(`quality gate: ${project} has no test script, skipping`);
        continue;
      }
      ensureDeps(project);
      console.log(`quality gate: test ${project}`);
      try {
        run(npmCmd, ["test"], project);
      } catch {
        failed = true;
      }
    }
  }

  if (mode === "all" || mode === "secrets") {
    console.log("quality gate: secrets scan");
    try {
      run(process.execPath, [join(root, "scripts", "scan-secrets.mjs")], root, false);
    } catch {
      failed = true;
    }
  }

  if (failed) {
    console.error("quality gate: FAILED");
    process.exit(1);
  }
  console.log("quality gate: PASS");
}

main();