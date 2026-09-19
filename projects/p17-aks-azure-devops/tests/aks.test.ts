import { test } from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_CONFIG } from "../src/config.ts";
import { evaluateCluster, renderAksCheatsheet, renderPipeline } from "../src/aks.ts";

test("all nodes ready and above floor is healthy", () => {
  const result = evaluateCluster(
    [{ name: "n1", ready: true }, { name: "n2", ready: true }, { name: "n3", ready: true }],
    3,
  );
  assert.equal(result.status, "healthy");
  assert.match(result.reason, /3\/3/);
});

test("fewer ready nodes than the floor is unready", () => {
  const result = evaluateCluster(
    [{ name: "n1", ready: true }, { name: "n2", ready: false }],
    3,
  );
  assert.equal(result.status, "unready");
});

test("capacity above the floor with a down node is degraded", () => {
  const result = evaluateCluster(
    [{ name: "n1", ready: true }, { name: "n2", ready: true }, { name: "n3", ready: true }, { name: "n4", ready: false }],
    3,
  );
  assert.equal(result.status, "degraded");
  assert.match(result.reason, /1 node\(s\) not ready/);
});

test("too few registered nodes is unready", () => {
  const result = evaluateCluster([{ name: "n1", ready: true }], 3);
  assert.equal(result.status, "unready");
  assert.match(result.reason, /need 3/);
});

test("the pipeline builds in ACR and helm-deploys to dev then prod", () => {
  const pipeline = renderPipeline(DEFAULT_CONFIG);
  assert.match(pipeline, /az acr build/);
  assert.match(pipeline, /helm upgrade --install/);
  assert.match(pipeline, /- stage: deploy_dev/);
  assert.match(pipeline, /- stage: deploy_prod/);
  assert.match(pipeline, /environment: shop-dev/);
  assert.match(pipeline, /environment: shop-prod/);
  assert.match(pipeline, /refs\/heads\/main/);
  assert.match(pipeline, /condition: and\(succeeded\(\)/);
  assert.equal(renderPipeline(DEFAULT_CONFIG), pipeline);
});

test("only service connections and variables, never credentials", () => {
  const pipeline = renderPipeline(DEFAULT_CONFIG);
  assert.match(pipeline, /azureSubscription: \$\(acrServiceConnection\)/);
  assert.match(pipeline, /azureSubscription: \$\(kubeServiceConnection\)/);
  assert.doesNotMatch(pipeline, /password\s*[:=]\s*["'][^"']+["']/);
  assert.doesNotMatch(pipeline, /\bAKIA[0-9A-Z]{16}\b|azure\.core\.windows\.net\/[^"']{12,}/);
});

test("the cheat sheet names the service connections", () => {
  const sheet = renderAksCheatsheet(DEFAULT_CONFIG);
  assert.match(sheet, /acr-push/);
  assert.match(sheet, /az aks get-credentials/);
  assert.match(sheet, /refs\/heads\/main/);
});