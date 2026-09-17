import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { defaultPipeline, validate, stageSequence, renderJenkinsfile } from "../src/pipeline.ts";
import { defaultDeploymentSpec, renderManifests } from "../src/manifests.ts";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

test("validate accepts a default pipeline", () => {
  assert.deepEqual(validate(defaultPipeline()), []);
});

test("validate rejects an uppercase name", () => {
  const pipeline = defaultPipeline();
  pipeline.name = "BadName";
  assert.ok(validate(pipeline).some((p) => p.includes("name")));
});

test("stageSequence runs build, push, deploy, rollout", () => {
  assert.deepEqual(stageSequence(), ["build", "push", "deploy", "rollout"]);
});

test("renderJenkinsfile contains all stages in order", () => {
  const jf = renderJenkinsfile(defaultPipeline());
  const sorted = ["stage('build')", "stage('push')", "stage('deploy')", "stage('rollout')"];
  const positions = sorted.map((s) => jf.indexOf(s));
  assert.ok(positions.every((i) => i >= 0));
  for (let i = 1; i < positions.length; i++) {
    const current = positions[i];
    const previous = positions[i - 1];
    assert.ok(current !== undefined && previous !== undefined && current > previous);
  }
});

test("renderJenkinsfile embeds the registry image", () => {
  const jf = renderJenkinsfile(defaultPipeline());
  assert.match(jf, /registry\.example\.com\/portfolio\/catalog/);
});

test("renderManifests contains a Deployment and a Service", () => {
  const out = renderManifests(defaultDeploymentSpec(defaultPipeline()));
  assert.match(out, /"kind": "Deployment"/);
  assert.match(out, /"kind": "Service"/);
});

test("manifests carry the image with tag", () => {
  const spec = defaultDeploymentSpec(defaultPipeline());
  const out = renderManifests(spec);
  assert.match(out, new RegExp(spec.image.replace("/", "/")));
});

test("check CLI reports PASS", () => {
  const stdout = execFileSync(process.execPath, [join(projectRoot, "src", "cli.ts"), "--check"], {
    encoding: "utf8",
  });
  assert.match(stdout, /model: PASS/);
});