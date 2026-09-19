import { test } from "node:test";
import assert from "node:assert/strict";

import { dockerTag, qualityGate } from "../src/gates.ts";

test("a green, zero-critical build passes the gate", () => {
  const result = qualityGate({ coverage: 91, criticalIssues: 0, requiredCoverage: 80, allowedCritical: 0 });
  assert.equal(result.level, "pass");
  assert.deepEqual(result.reasons, ["quality gate passed"]);
});

test("low coverage with critical issues fails the gate", () => {
  const result = qualityGate({ coverage: 45, criticalIssues: 4, requiredCoverage: 80, allowedCritical: 0 });
  assert.equal(result.level, "fail");
  assert.equal(result.reasons.length, 2);
});

test("a near-miss without criticals is a warning", () => {
  const result = qualityGate({ coverage: 78, criticalIssues: 0, requiredCoverage: 80, allowedCritical: 0 });
  assert.equal(result.level, "warn");
});

test("tag pushes resolve to the stable version", () => {
  assert.deepEqual(dockerTag("main", "1.4.2", "77", true), ["1.4.2"]);
});

test("main and release branches ship a candidate and the version", () => {
  assert.deepEqual(dockerTag("main", "1.4.2", "77", false), ["1.4.2"]);
  assert.deepEqual(dockerTag("release/1.4", "1.4.2", "77", false), ["1.4-rc.77", "1.4.2"]);
});

test("feature branches get a hashed candidate tag", () => {
  const [tag] = dockerTag("feat/My Thing", "1.4.2", "77", false);
  assert.ok(tag!.startsWith("feat-"));
  assert.ok(tag!.endsWith("-77"));
});