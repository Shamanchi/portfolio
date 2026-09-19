import { test } from "node:test";
import assert from "node:assert/strict";

import { validateConfig, DEFAULT_CONFIG, type JavaPipelineConfig } from "../src/model.ts";

function clone(overrides: Partial<JavaPipelineConfig>): JavaPipelineConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}

test("defaults are valid", () => {
  assert.deepEqual(validateConfig(DEFAULT_CONFIG), []);
});

test("app names must be lowercase with dashes", () => {
  assert.ok(validateConfig(clone({ appName: "OrderService" })).length > 0);
  assert.ok(validateConfig(clone({ appName: "order service" })).length > 0);
});

test("maven and jdk versions are constrained", () => {
  assert.ok(validateConfig(clone({ mavenVersion: "4.0.0" })).length > 0);
  assert.ok(validateConfig(clone({ jdkVersion: "23" })).length > 0);
});

test("semver artifact version is required", () => {
  assert.ok(validateConfig(clone({ artifactVersion: "1.4" })).length > 0);
});

test("registries, sonar and repo urls are validated", () => {
  assert.ok(validateConfig(clone({ registryHost: "harbor" })).length > 0);
  assert.ok(validateConfig(clone({ sonarQubeUrl: "http://sonar" })).length > 0);
  assert.ok(validateConfig(clone({ repoUrl: "git@github.com:shamanchi/x.git" })).length > 0);
});