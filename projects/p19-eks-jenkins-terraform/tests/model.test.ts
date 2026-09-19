import { test } from "node:test";
import assert from "node:assert/strict";

import { validateConfig, DEFAULT_CONFIG, type TfStackConfig } from "../src/model.ts";

function clone(overrides: Partial<TfStackConfig>): TfStackConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}

test("defaults are valid", () => {
  assert.deepEqual(validateConfig(DEFAULT_CONFIG), []);
});

test("workspace and region are constrained", () => {
  assert.ok(validateConfig(clone({ workspace: "preprod" })).length > 0);
  assert.ok(validateConfig(clone({ region: "eu-central" })).length > 0);
});

test("cluster names must be DNS labels", () => {
  assert.ok(validateConfig(clone({ clusterName: "Shop_EKS" })).length > 0);
});

test("node count must fit the autoscaling range", () => {
  assert.ok(validateConfig(clone({ nodeCount: 11 })).length > 0);
  assert.ok(validateConfig(clone({ nodeCount: 1 })).length > 0);
});

test("instance types and disk sizes are validated", () => {
  assert.ok(validateConfig(clone({ nodeInstanceType: "t3.medium" })).length > 0);
  assert.ok(validateConfig(clone({ nodeDiskSize: 20 })).length > 0);
});