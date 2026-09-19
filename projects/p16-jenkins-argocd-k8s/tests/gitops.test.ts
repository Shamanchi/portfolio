import { test } from "node:test";
import assert from "node:assert/strict";

import { syncDecision, describeSyncChain } from "../src/gitops.ts";

test("matching manifest and live state require no sync", () => {
  const decision = syncDecision({ desiredTag: "1.4.2", liveTag: "1.4.2", desiredNamespace: "prod", liveNamespace: "prod" });
  assert.equal(decision.outOfSync, false);
  assert.equal(decision.action, "noop");
});

test("an image tag drift triggers a sync", () => {
  const decision = syncDecision({ desiredTag: "1.5.0", liveTag: "1.4.2", desiredNamespace: "prod", liveNamespace: "prod" });
  assert.equal(decision.outOfSync, true);
  assert.equal(decision.action, "sync");
  assert.match(decision.reason, /1\.5\.0/);
});

test("a namespace drift blocks the sync instead of auto-pruning", () => {
  const decision = syncDecision({ desiredTag: "1.5.0", liveTag: "1.4.2", desiredNamespace: "prod", liveNamespace: "staging" });
  assert.equal(decision.outOfSync, true);
  assert.equal(decision.action, "blocked");
});

test("the sync chain explanation reflects the loop mode", () => {
  assert.match(describeSyncChain(true), /continuously/);
  assert.match(describeSyncChain(false, 5), /every 5 minutes/);
});