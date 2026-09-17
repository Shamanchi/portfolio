import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { defaultPipeline, validate } from "../src/model.ts";
import { renderCiWorkflow, renderDeployWorkflow } from "../src/workflow.ts";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

test("validate accepts a default model", () => {
  assert.deepEqual(validate(defaultPipeline()), []);
});

test("validate requires at least one reviewer per environment", () => {
  const model = defaultPipeline();
  const env = model.environments[0];
  if (env) {
    env.requiredReviewers = 0;
  }
  assert.ok(validate(model).some((p) => p.includes("reviewer")));
});

test("validate forbids duplicated stages", () => {
  const model = defaultPipeline();
  model.stages = ["quality", "quality", "build", "promote"];
  assert.ok(validate(model).some((p) => p.includes("duplicated")));
});

test("ci workflow gates on the production branch and runs gate", () => {
  const yaml = renderCiWorkflow(defaultPipeline());
  assert.match(yaml, /branches: \[main\]/);
  assert.match(yaml, /npm run gate/);
});

test("deploy workflow pins the environment and immutable tag", () => {
  const yaml = renderDeployWorkflow(defaultPipeline());
  assert.match(yaml, /environment: production/);
  assert.match(yaml, /github\.sha/);
});

test("deploy workflow never embeds plain secret values", () => {
  const yaml = renderDeployWorkflow(defaultPipeline());
  assert.doesNotMatch(yaml, /(ghp_|AKIA[0-9A-Z]{16}|BEGIN [A-Z ]+PRIVATE KEY)/i);
  assert.doesNotMatch(yaml, /(password|token|secret):\s*[^\s{$]/i);
  assert.match(yaml, /secrets\.KUBECONFIG/);
});

test("check CLI reports PASS", () => {
  const stdout = execFileSync(process.execPath, [join(projectRoot, "src", "cli.ts"), "--check"], {
    encoding: "utf8",
  });
  assert.match(stdout, /model: PASS/);
});