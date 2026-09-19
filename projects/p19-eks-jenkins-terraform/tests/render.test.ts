import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { DEFAULT_CONFIG } from "../src/model.ts";
import { renderMainTf, renderOutputsTf, renderApplySheet } from "../src/terraform.ts";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

test("the rendered main.tf describes the full stack", () => {
  const tf = renderMainTf(DEFAULT_CONFIG);
  assert.match(tf, /provider "aws"/);
  assert.match(tf, /resource "aws_eks_cluster" "this"/);
  assert.match(tf, /resource "aws_eks_node_group" "this"/);
  assert.match(tf, /resource "helm_release" "jenkins"/);
  assert.match(tf, /backend "s3"/);
  assert.equal(renderMainTf(DEFAULT_CONFIG), tf);
});

test("outputs expose the entry points", () => {
  const outputs = renderOutputsTf(DEFAULT_CONFIG);
  assert.match(outputs, /cluster_endpoint/);
  assert.match(outputs, /jenkins_url/);
  assert.match(outputs, /prod\.example\.internal/);
});

test("the apply sheet wires kubectl after apply", () => {
  assert.match(renderApplySheet(DEFAULT_CONFIG), /terraform workspace select prod/);
  assert.match(renderApplySheet(DEFAULT_CONFIG), /eks update-kubeconfig --region eu-central-1/);
});

test("check CLI reports terraform PASS", () => {
  const stdout = execFileSync(process.execPath, [join(projectRoot, "src", "cli.ts"), "--check"], {
    encoding: "utf8",
  });
  assert.match(stdout, /terraform: PASS/);
});