import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { SA_RULES, scanText } from "../src/sast.ts";
import { DEFAULT_PLAN, renderCheatSheet, renderWorkflow } from "../src/pipeline.ts";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

test("rule set covers the core categories", () => {
  const ids = SA_RULES.map((rule) => rule.id);
  assert.ok(ids.includes("S01"));
  assert.ok(ids.includes("S02"));
  assert.ok(ids.includes("S03"));
  assert.ok(ids.includes("S04"));
});

test("scanText flags eval and a hard-coded credential", () => {
  const findings = scanText(
    `const fn = new Function("return 1");\nconst api_secret = "ABCDEFGH12345678";\n`,
  );
  assert.equal(findings.some((finding) => finding.rule === "S01"), true);
  assert.equal(findings.some((finding) => finding.rule === "S03"), true);
  assert.equal(findings.some((finding) => finding.evidence.includes("ABCDEFGH12345678")), true);
});

test("scanText reports line numbers", () => {
  const findings = scanText("ok = 1\nevil = eval(\"x\")\n");
  const hit = findings.find((finding) => finding.rule === "S01");
  assert.ok(hit);
  assert.equal(hit.line, 2);
});

test("benign source stays clean", () => {
  assert.deepEqual(scanText("const total = price * quantity;\nreturn { ok: true, total };\n"), []);
});

test("workflow gates builds and scans images only on the main branch", () => {
  const yaml = renderWorkflow(DEFAULT_PLAN);
  assert.match(yaml, /quality:/);
  assert.match(yaml, /sast:/);
  assert.match(yaml, /trivy-action/);
  assert.match(yaml, /github\.event_name == 'push'/);
  assert.doesNotMatch(yaml, /\bghp_[A-Za-z0-9]{20,}\b/);
  assert.doesNotMatch(yaml, /password\s*[=:]\s*["']/);
  assert.equal(renderWorkflow(DEFAULT_PLAN), yaml);
});

test("cheat sheet explains the promotion", () => {
  assert.match(renderCheatSheet(DEFAULT_PLAN), /merge to main/i);
});

test("check CLI reports sast PASS", () => {
  const stdout = execFileSync(process.execPath, [join(projectRoot, "src", "cli.ts"), "--check"], {
    encoding: "utf8",
  });
  assert.match(stdout, /sast: PASS/);
});

test("menu CLI lists dishes", () => {
  const stdout = execFileSync(process.execPath, [join(projectRoot, "src", "cli.ts"), "--menu"], {
    encoding: "utf8",
  });
  assert.match(stdout, /chicken-biryani/);
  assert.match(stdout, /sample order total/);
});