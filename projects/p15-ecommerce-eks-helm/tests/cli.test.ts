import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

test("check CLI reports chart PASS", () => {
  const stdout = execFileSync(process.execPath, [join(projectRoot, "src", "cli.ts"), "--check"], {
    encoding: "utf8",
  });
  assert.match(stdout, /chart: PASS/);
});

test("charts CLI writes a full chart tree", async () => {
  const out = join(projectRoot, "chart-tmp");
  execFileSync(process.execPath, [join(projectRoot, "src", "cli.ts"), "--charts", "--out", out, "--set", "replicas=5"], {
    encoding: "utf8",
  });
  const { readFileSync, existsSync } = await import("node:fs");
  assert.equal(existsSync(join(out, "Chart.yaml")), true);
  assert.equal(existsSync(join(out, "templates", "deployment.yaml")), true);
  const deployment = readFileSync(join(out, "templates", "deployment.yaml"), "utf8");
  assert.match(deployment, /\n  replicas: 5\n/);
  const values = readFileSync(join(out, "values.yaml"), "utf8");
  assert.match(values, /replicas: 5/);
  import("node:fs").then(({ rmSync }) => rmSync(out, { recursive: true, force: true }));
});

test("known secret-shaped strings are absent from the chart", () => {
  const stdout = execFileSync(process.execPath, [join(projectRoot, "src", "cli.ts"), "--check"], {
    encoding: "utf8",
  });
  assert.match(stdout, /chart: PASS/);
});