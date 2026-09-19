import { test } from "node:test";
import assert from "node:assert/strict";

import { validateValues, DEFAULT_VALUES, type ChartValues } from "../src/model.ts";

function clone(overrides: Partial<ChartValues>): ChartValues {
  return structuredClone({ ...DEFAULT_VALUES, ...overrides });
}

test("default values are valid", () => {
  assert.deepEqual(validateValues(DEFAULT_VALUES), []);
});

test("namespace must be a DNS label", () => {
  assert.ok(validateValues(clone({ namespace: "Shop_Staging" })).length > 0);
});

test("replica range is enforced", () => {
  assert.ok(validateValues(clone({ replicas: 0 })).length > 0);
  assert.ok(validateValues(clone({ replicas: 200 })).length > 0);
});

test("cpu and memory units are enforced", () => {
  assert.ok(validateValues(clone({ resources: { ...DEFAULT_VALUES.resources, requests: { cpu: "half", memory: "256Mi" }, limits: { cpu: "500m", memory: "512Mi" } } })).length > 0);
  assert.ok(validateValues(clone({ resources: { ...DEFAULT_VALUES.resources, limits: { cpu: "500m", memory: "0M" } } })).length > 0);
});

test("hpa bounds are checked", () => {
  assert.ok(validateValues(clone({ hpa: { ...DEFAULT_VALUES.hpa, maxReplicas: 2 } })).length > 0);
  assert.ok(validateValues(clone({ hpa: { ...DEFAULT_VALUES.hpa, cpuUtilization: 0 } })).length > 0);
});

test("an empty ingress host fails when ingress is enabled", () => {
  assert.ok(validateValues(clone({ ingress: { enabled: true, host: "" } })).length > 0);
});

test("a malformed image repository is rejected", () => {
  assert.ok(validateValues(clone({ image: { ...DEFAULT_VALUES.image, repository: "not a repo" } })).length > 0);
});