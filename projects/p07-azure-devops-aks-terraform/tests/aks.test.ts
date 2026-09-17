import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { defaultAks, validate } from "../src/model.ts";
import { renderTerraform } from "../src/terraform.ts";
import { renderPipeline, renderCheatSheet } from "../src/pipeline.ts";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

test("validate accepts the default cluster", () => {
  assert.deepEqual(validate(defaultAks()), []);
});

test("validate rejects an autoscaling range where max < min", () => {
  const model = defaultAks();
  model.nodePool.maxCount = 1;
  assert.ok(validate(model).some((p) => p.includes("range")));
});

test("terraform emits the AKS cluster with autoscaling", () => {
  const tf = renderTerraform(defaultAks());
  assert.match(tf, /resource "azurerm_kubernetes_cluster" "main"/);
  assert.match(tf, /enable_auto_scaling\s+=\s+true/);
  assert.match(tf, /max_count\s+=\s+4/);
});

test("terraform never embeds an ssh key or subscription value", () => {
  const tf = renderTerraform(defaultAks());
  assert.doesNotMatch(tf, /ssh-rsa/);
  assert.doesNotMatch(tf, /SUBSCRIPTION_ID:[^P]/);
  assert.match(tf, /var\.ssh_public_key/);
});

test("pipeline gates apply behind an approval environment", () => {
  const yaml = renderPipeline(defaultAks());
  assert.match(yaml, /environment: prod-approval/);
  assert.match(yaml, /stage: apply/);
  assert.match(yaml, /terraform -chdir=infra plan/);
});

test("pipeline and cheat sheet reference only variable-group names", () => {
  const yaml = renderPipeline(defaultAks()) + renderCheatSheet(defaultAks());
  assert.match(yaml, /group: terraform-aks/);
  assert.doesNotMatch(yaml, /(\$\(CLIENT_SECRET\)\s*[:=]|ssh-rsa)/);
});

test("check CLI reports PASS", () => {
  const stdout = execFileSync(process.execPath, [join(projectRoot, "src", "cli.ts"), "--check"], {
    encoding: "utf8",
  });
  assert.match(stdout, /model: PASS/);
});