import { test } from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_APP, renderManifest, type AppModel } from "../src/appmodel.ts";
import { lintApp } from "../src/lint.ts";

test("the default app passes lint", () => {
  const result = lintApp(DEFAULT_APP);
  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

function cloneApp(overrides: Partial<AppModel>): AppModel {
  return { ...DEFAULT_APP, ...overrides };
}

test("missing INTERNET permission is an error for a network app", () => {
  const result = lintApp(cloneApp({ permissions: [] }));
  const finding = result.findings.find((entry) => entry.rule === "L01");
  assert.ok(finding);
  assert.equal(finding.severity, "error");
  assert.equal(result.ok, false);
});

test("deprecated storage permission is a warning", () => {
  const result = lintApp(
    cloneApp({
      permissions: ["android.permission.INTERNET", "android.permission.WRITE_EXTERNAL_STORAGE"],
    }),
  );
  assert.equal(result.findings.some((entry) => entry.rule === "L02" && entry.severity === "warning"), true);
  assert.equal(result.ok, true);
});

test("disabled release minification is an error", () => {
  const result = lintApp(cloneApp({ releaseMinify: false }));
  assert.equal(result.findings.some((entry) => entry.rule === "L03" && entry.severity === "error"), true);
});

test("an sdk inconsistency is flagged", () => {
  const result = lintApp(cloneApp({ minSdk: 40, targetSdk: 35 }));
  assert.equal(result.findings.some((entry) => entry.rule === "L05"), true);
});

test("manifest renders version code and name", () => {
  const content = renderManifest(DEFAULT_APP, "1.2.3", 1020300);
  assert.match(content, /android:versionCode="1020300"/);
  assert.match(content, /android:versionName="1.2.3"/);
  assert.match(content, /android.permission.INTERNET/i);
});