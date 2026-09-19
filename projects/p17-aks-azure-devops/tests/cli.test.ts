import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

test("check CLI reports pipeline PASS", () => {
  const stdout = execFileSync(process.execPath, [join(projectRoot, "src", "cli.ts"), "--check"], {
    encoding: "utf8",
  });
  assert.match(stdout, /pipeline: PASS/);
});

test("cluster CLI reports degraded for the default node set", () => {
  const stdout = execFileSync(process.execPath, [join(projectRoot, "src", "cli.ts"), "--cluster"], {
    encoding: "utf8",
  });
  assert.match(stdout, /status: degraded/);

  const healthy = execFileSync(
    process.execPath,
    [join(projectRoot, "src", "cli.ts"), "--cluster", "--nodes", "n1=true,n2=true,n3=true"],
    { encoding: "utf8" },
  );
  assert.match(healthy, /status: healthy/);
});