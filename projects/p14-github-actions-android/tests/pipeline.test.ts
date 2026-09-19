import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  DEFAULT_PLAN,
  renderBuildGradleKts,
  renderSigningNotes,
  renderWorkflow,
} from "../src/pipeline.ts";
import { DEFAULT_APP } from "../src/appmodel.ts";
import { buildInfo } from "../src/versioning.ts";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

test("workflow chains validate, lint, test, assemble and a tag-gated release", () => {
  const yaml = renderWorkflow(DEFAULT_PLAN);
  assert.match(yaml, /name: android-ci/);
  assert.match(yaml, /gradlew lintDebug/);
  assert.match(yaml, /gradlew testDebugUnitTest/);
  assert.match(yaml, /gradlew assembleDebug/);
  assert.match(yaml, /gradlew assembleRelease/);
  assert.match(yaml, /if: startsWith\(github\.ref, 'refs\/tags\/v'\)/);
  assert.equal(renderWorkflow(DEFAULT_PLAN), yaml);
});

test("release signing only references repo secrets", () => {
  const yaml = renderWorkflow(DEFAULT_PLAN);
  assert.match(yaml, /\${{ secrets\.ANDROID_KEYSTORE_B64 }}/);
  assert.match(yaml, /\${{ secrets\.KEYSTORE_PASSWORD }}/);
  assert.doesNotMatch(yaml, /(KEYSTORE_PASSWORD|KEY_PASSWORD)\s*[:=]\s*["'][^"']+["']/);
  assert.doesNotMatch(yaml, /\bghp_[A-Za-z0-9]{20,}\b/);
  assert.doesNotMatch(yaml, /----BEGIN (RSA |EC )?PRIVATE KEY----/);
});

test("gradle snippet carries the computed version", () => {
  const info = buildInfo("v2.1.0", undefined, 0);
  const gradle = renderBuildGradleKts(DEFAULT_APP, info);
  assert.match(gradle, /namespace = "dev\.shamanchi\.runnotes"/);
  assert.match(gradle, /versionName = "2\.1\.0"/);
  assert.match(gradle, /versionCode = 2010000/);
  assert.match(gradle, /isMinifyEnabled = true/);
});

test("signing notes explain the secret flow", () => {
  assert.match(renderSigningNotes(DEFAULT_PLAN), /ANDROID_KEYSTORE_B64/);
  assert.match(renderSigningNotes(DEFAULT_PLAN), /git tag v1\.2\.3/);
});

test("check CLI reports pipeline PASS", () => {
  const stdout = execFileSync(process.execPath, [join(projectRoot, "src", "cli.ts"), "--check"], {
    encoding: "utf8",
  });
  assert.match(stdout, /pipeline: PASS/);
});

test("version CLI prints a resolved candidate", () => {
  const stdout = execFileSync(
    process.execPath,
    [join(projectRoot, "src", "cli.ts"), "--version", "--describe", "v0.3.1-7-gdeadbeef"],
    { encoding: "utf8" },
  );
  assert.match(stdout, /versionName: 0\.3\.1-rc\.1/);
});