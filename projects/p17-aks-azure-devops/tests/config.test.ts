import { test } from "node:test";
import assert from "node:assert/strict";

import { validateConfig, DEFAULT_CONFIG, type AksPipelineConfig } from "../src/config.ts";

function clone(overrides: Partial<AksPipelineConfig>): AksPipelineConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}

test("defaults are valid", () => {
  assert.deepEqual(validateConfig(DEFAULT_CONFIG), []);
});

test("cluster, namespace and service names are DNS labels", () => {
  assert.ok(validateConfig(clone({ serviceName: "Shop_API" })).length > 0);
  assert.ok(validateConfig(clone({ clusterName: "AKS-Prod" })).length > 0);
  assert.ok(validateConfig(clone({ namespace: "Shop_Prod" })).length > 0);
});

test("acr names must be globally unique, lowercase alnum", () => {
  assert.ok(validateConfig(clone({ acrName: "Shop_ACR" })).length > 0);
  assert.ok(validateConfig(clone({ acrName: "acr" })).length > 0);
  assert.ok(validateConfig(clone({ acrName: "a".repeat(51) })).length > 0);
});

test("service connections are required", () => {
  assert.ok(validateConfig(clone({ acrServiceConnection: "" })).length > 0);
  assert.ok(validateConfig(clone({ kubeServiceConnection: "" })).length > 0);
});

test("location format is checked", () => {
  assert.equal(validateConfig(clone({ location: "West Europe" })).length > 0, true);
  assert.equal(validateConfig(clone({ requiredNodes: 99 })).length > 0, true);
});