import { test } from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_CONFIG } from "../src/model.ts";
import { braceBalance, decideApply } from "../src/terraform.ts";

test("a fresh cluster triggers create", () => {
  const decision = decideApply(DEFAULT_CONFIG, { nodesRunning: 0, version: undefined, jenkinsDeployed: false });
  assert.equal(decision.action, "create");
  assert.match(decision.reasons[0]!, /no cluster observed/);
});

test("a drifted cluster triggers update", () => {
  const decision = decideApply(DEFAULT_CONFIG, { nodesRunning: 2, version: "1.30", jenkinsDeployed: false });
  assert.equal(decision.action, "update");
  assert.equal(decision.reasons.length, 3);
});

test("a converged cluster is a noop", () => {
  const decision = decideApply(DEFAULT_CONFIG, { nodesRunning: 3, version: "1.32", jenkinsDeployed: true });
  assert.equal(decision.action, "noop");
});

test("the prod workspace never destroys in place", () => {
  const decision = decideApply({ ...DEFAULT_CONFIG, workspace: "dev" }, {
    nodesRunning: 4,
    version: "1.28",
    jenkinsDeployed: false,
  });
  assert.equal(decision.action, "destroy");
});

test("braces are balanced in the rendered stack", () => {
  assert.ok(braceBalance("resource \"a\" { field = 1 }"));
  assert.ok(!braceBalance("resource \"a\" { field = 1 }}}"));
});