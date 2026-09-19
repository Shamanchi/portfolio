import { parseArgs } from "node:util";
import { writeFileSync } from "node:fs";
import {
  buildInfo,
  formatVersion,
  nextVersion,
  parseVersion,
  versionCodeFrom,
  type VersionBump,
} from "./versioning.ts";
import { DEFAULT_APP, renderManifest } from "./appmodel.ts";
import { lintApp } from "./lint.ts";
import {
  DEFAULT_PLAN,
  renderBuildGradleKts,
  renderSigningNotes,
  renderWorkflow,
} from "./pipeline.ts";

const { values } = parseArgs({
  options: {
    check: { type: "boolean", short: "c" },
    lint: { type: "boolean", short: "l" },
    version: { type: "boolean", short: "v" },
    workflow: { type: "boolean", short: "w" },
    notes: { type: "boolean", short: "n" },
    tag: { type: "string" },
    describe: { type: "string" },
    out: { type: "string", short: "o" },
  },
});

function writeOrPrint(filename: string | undefined, content: string): void {
  if (filename) {
    writeFileSync(filename, content, "utf8");
    console.log(`wrote ${filename}`);
  } else {
    process.stdout.write(content);
  }
}

function computeInfo(): { versionName: string; versionCode: number; channel: "release" | "candidate" } {
  if (values.tag !== undefined) {
    return buildInfo(values.tag, undefined, 0);
  }
  if (values.describe !== undefined) {
    return buildInfo("", values.describe, 0);
  }
  return buildInfo("", undefined, 0);
}

function runCheck(): void {
  const problems: string[] = [];
  const expect = (label: string, actual: unknown, wanted: unknown) => {
    if (actual !== wanted) problems.push(`${label}: expected ${wanted}, got ${actual}`);
  };

  const lint = lintApp(DEFAULT_APP);
  expect("default app lint", lint.ok, true);

  const parsed = parseVersion("v1.2.3");
  expect("tag parsed", parsed?.major, 1);
  expect("patch bump", formatVersion(nextVersion(parsed!, "patch")), "1.2.4");
  expect("rc bump", formatVersion(nextVersion(parsed!, "rc")), "1.2.3-rc.1");
  expect(
    "versionCode",
    versionCodeFrom(parseVersion("1.2.3")!, 4),
    10203 * 100 + 4,
  );

  const workflow = renderWorkflow(DEFAULT_PLAN);
  if (/\${{ secrets\.[A-Z_]+ }}/.exec(workflow) === null) {
    problems.push("workflow: release signing must come from repo secrets only");
  }
  if (/(KEYSTORE_PASSWORD|KEY_PASSWORD)\s*[:=]\s*["'][^"']+["']/.test(workflow)) {
    problems.push("workflow: a literal password is embedded");
  }
  if (!/release:/.test(workflow) || !/if: startsWith\(github\.ref, 'refs\/tags\/v'\)/.test(workflow)) {
    problems.push("workflow: the release job must be tag-gated");
  }

  const tested = new Set<string>();
  for (const bump of ["major", "minor", "patch", "rc", "release"] as VersionBump[]) {
    tested.add(formatVersion(nextVersion(parseVersion("2.5.0")!, bump)));
  }
  expect("all bumps deterministic", tested.size, 5);

  if (problems.length === 0) {
    console.log("pipeline: PASS (semver, lint, android-ci workflow)");
  } else {
    for (const problem of problems) {
      console.error(`pipeline: ${problem}`);
    }
    process.exitCode = 1;
  }
}

if (values.check) {
  runCheck();
} else if (values.lint) {
  const lint = lintApp(DEFAULT_APP);
  if (lint.ok) {
    console.log(`lint: PASS (${DEFAULT_APP.name}, ${lint.findings.length} findings)`);
  } else {
    for (const finding of lint.findings) {
      console.error(`lint: ${finding.severity.toUpperCase()} ${finding.rule}: ${finding.message}`);
    }
    process.exitCode = 1;
  }
} else if (values.version) {
  const info = computeInfo();
  const app = DEFAULT_APP;
  const manifest = renderManifest(app, info.versionName, info.versionCode);
  const gradle = renderBuildGradleKts(app, info);
  writeOrPrint(
    values.out,
    `channel: ${info.channel}\nversionName: ${info.versionName}\nversionCode: ${info.versionCode}\n\n${gradle}\n${manifest}`,
  );
} else if (values.workflow) {
  writeOrPrint(values.out, renderWorkflow(DEFAULT_PLAN));
} else if (values.notes) {
  writeOrPrint(values.out, renderSigningNotes(DEFAULT_PLAN));
} else {
  runCheck();
}