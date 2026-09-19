import { test } from "node:test";
import assert from "node:assert/strict";

import { backendKey, validateConfig, DEFAULT_CONFIG, planGate, interpretPlan, type AzurePipelineConfig } from "../src/model.ts";

function clone(overrides: Partial<AzurePipelineConfig>): AzurePipelineConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}

test("defaults are valid", () => {
  assert.deepEqual(validateConfig(DEFAULT_CONFIG), []);
});

test("regions outside the allow list are rejected", () => {
  assert.ok(validateConfig(clone({ location: "eastus" })).length > 0);
});

test("environments are constrained", () => {
  assert.ok(validateConfig(clone({ environment: "test" })).length > 0);
});

test("storage account names are 3..24 lowercase", () => {
  assert.ok(validateConfig(clone({ storageAccount: "STG" })).length > 0);
  assert.ok(validateConfig(clone({ storageAccount: "stg" })).length === 0);
});

test("storage account name length is range checked", () => {
  assert.ok(validateConfig(clone({ storageAccount: "st".repeat(13) })).length > 0);
});

test("backend keys are namespaced by workspace", () => {
  assert.equal(backendKey("acme", "kubernetes cluster", "infra"), "acme/kubernetes-cluster/infra.tfstate");
});

test("plan output is parsed into a report", () => {
  const report = interpretPlan("Plan: 2 to add, 1 to change, 3 to destroy.");
  assert.deepEqual(report, { changes: 0, adds: 2, updates: 1, destroys: 3 });
  assert.equal(interpretPlan("No changes. Infrastructure is up-to-date."), undefined);
});

test("the plan gate applies any change on non-prod", () => {
  assert.equal(planGate("Plan: 1 to add, 0 to change, 0 to destroy.", "dev").apply, true);
});

test("the plan gate refuses destroys on prod", () => {
  assert.equal(planGate("Plan: 0 to add, 0 to change, 3 to destroy.", "prod").apply, false);
});

test("the plan gate noops on an empty plan", () => {
  assert.equal(planGate("No changes. Infrastructure is up-to-date.", "dev").apply, false);
});