import { test } from "node:test";
import assert from "node:assert/strict";

import { validateConfig, DEFAULT_ARGO, DEFAULT_JENKINS, type ArgoConfig } from "../src/config.ts";

function clone(overrides: Partial<ArgoConfig>): ArgoConfig {
  return { ...DEFAULT_ARGO, ...overrides };
}

test("defaults are valid", () => {
  assert.deepEqual(validateConfig(DEFAULT_ARGO, DEFAULT_JENKINS), []);
});

test("app names must be DNS labels", () => {
  assert.ok(validateConfig(clone({ appName: "Shop_Prod" }), DEFAULT_JENKINS).length > 0);
});

test("source repos must be git URLs", () => {
  assert.ok(validateConfig(clone({ sourceRepo: "github.com/example/shop" }), DEFAULT_JENKINS).length > 0);
});

test("disabled sync automation is rejected", () => {
  assert.ok(validateConfig(clone({ autoPrune: false, selfHeal: false }), DEFAULT_JENKINS).length > 0);
});

test("image repo and credential id are validated", () => {
  assert.ok(validateConfig(DEFAULT_ARGO, { ...DEFAULT_JENKINS, imageRepo: "not a repo" }).length > 0);
  assert.ok(validateConfig(DEFAULT_ARGO, { ...DEFAULT_JENKINS, registryCredentialId: "" }).length > 0);
});