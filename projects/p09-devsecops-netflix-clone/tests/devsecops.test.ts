import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { SAMPLE_CATALOG, defaultStore, filterByGenre, topRated, validateItem } from "../src/catalog.ts";
import { scanText, SAST_RULES } from "../src/sast.ts";
import { renderWorkflow, renderCheatSheet, defaultPipeline } from "../src/pipeline.ts";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

test("sample catalog is valid", () => {
  for (const item of SAMPLE_CATALOG) {
    assert.deepEqual(validateItem(item), []);
  }
});

test("default store returns own copies", () => {
  const store = defaultStore();
  const first = store.list[0];
  if (first) {
    first.title = "changed";
  }
  assert.notEqual(SAMPLE_CATALOG[0]?.title, "changed");
});

test("filterByGenre keeps only matching genre", () => {
  const items = filterByGenre(defaultStore(), "action");
  assert.equal(items.every((item) => item.genre === "action"), true);
  assert.equal(items.length, 1);
});

test("topRated returns the highest rated first", () => {
  const items = topRated(defaultStore(), 2);
  assert.equal(items[0]?.title, "Deep Signal");
});

test("scanRules cover the basic categories", () => {
  const ids = SAST_RULES.map((rule) => rule.id);
  assert.ok(ids.includes("R01"));
  assert.ok(ids.includes("R03"));
});

test("scanText flags eval and hardcoded tokens", () => {
  const findings = scanText(`const a = eval("1+1");\nconst api_token = "SECRETEXAMPLE12345";\n`);
  assert.equal(findings.some((f) => f.rule === "R01"), true);
  assert.equal(findings.some((f) => f.evidence.includes("SECRETEXAMPLE12345")), true);
});

test("scanText reports file, line and rule", () => {
  const findings = scanText("x = 1\ny = 2\neval(y)");
  const hit = findings.find((f) => f.rule === "R01");
  assert.ok(hit);
  assert.equal(hit.line, 3);
});

test("workflow gates sast before image build", () => {
  const yaml = renderWorkflow(defaultPipeline());
  assert.match(yaml, /^\s*quality:/m);
  assert.match(yaml, /^\s*sast:/m);
  assert.match(yaml, /github\.event_name == 'push'/);
});

test("check CLI reports PASS", () => {
  const stdout = execFileSync(process.execPath, [join(projectRoot, "src", "cli.ts"), "--check"], {
    encoding: "utf8",
  });
  assert.match(stdout, /sast: PASS/);
});

test("cheat sheet lists audit level", () => {
  const notes = renderCheatSheet(defaultPipeline());
  assert.match(notes, /high/);
});