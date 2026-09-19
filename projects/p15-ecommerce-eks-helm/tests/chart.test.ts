import { test } from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_VALUES } from "../src/model.ts";
import { interpolate, renderChart, renderValuesYaml, RenderError } from "../src/chart.ts";
import { renderEksPlan, renderReadinessNotes, DEFAULT_EKS_PLAN } from "../src/eks.ts";

test("chart renders with resolved values and no leftover expressions", () => {
  const files = renderChart(DEFAULT_VALUES, "shop");
  assert.equal(files.some((file) => file.path === "templates/ingress.yaml"), true);
  assert.equal(files.some((file) => file.path === "templates/hpa.yaml"), true);

  const deployment = files.find((file) => file.path === "templates/deployment.yaml")!.content;
  assert.match(deployment, /name: shop-api/);
  assert.match(deployment, /namespace: shop/);
  assert.match(deployment, /\n  replicas: 3\n/);
  assert.match(deployment, /image: "ghcr\.io\/shamanchi\/ecommerce-api:1\.4\.2"/);
  assert.match(deployment, /cpu: 125m/);
  assert.match(deployment, /secretRef:\n                name: ecommerce-db-credentials/);
  assert.doesNotMatch(deployment, /\{\{/);
});

test("disabled ingress and hpa are omitted from the chart", () => {
  const files = renderChart(
    {
      ...DEFAULT_VALUES,
      hpa: { ...DEFAULT_VALUES.hpa, enabled: false },
      ingress: { ...DEFAULT_VALUES.ingress, enabled: false },
    },
    "shop",
  );
  assert.equal(files.some((file) => file.path === "templates/hpa.yaml"), false);
  assert.equal(files.some((file) => file.path === "templates/ingress.yaml"), false);
});

test("rendering is deterministic", () => {
  const a = renderChart(DEFAULT_VALUES, "shop").map((file) => file.path + ":" + file.content);
  const b = renderChart(DEFAULT_VALUES, "shop").map((file) => file.path + ":" + file.content);
  assert.deepEqual(a, b);
});

test("an unknown template path raises a RenderError", () => {
  assert.throws(() => interpolate("{{ .Values.never }}", DEFAULT_VALUES, "shop"), RenderError);
  assert.throws(() => interpolate("{{ .Chart.Version }}", DEFAULT_VALUES, "shop"), RenderError);
});

test("values yaml reflects the model", () => {
  const yaml = renderValuesYaml(DEFAULT_VALUES);
  assert.match(yaml, /replicas: 3/);
  assert.match(yaml, /tag: 1\.4\.2/);
  assert.match(yaml, /hpa:\n  enabled: true/);
});

test("the eks plan covers install, rollback and external secrets", () => {
  const plan = renderEksPlan(DEFAULT_EKS_PLAN, DEFAULT_VALUES);
  assert.match(plan, /helm upgrade --install/);
  assert.match(plan, /helm rollback/);
  assert.match(plan, /sealedsecrets/i);
  assert.match(plan, /ecommerce-db-credentials/);
});

test("readiness notes expose the contract", () => {
  const notes = renderReadinessNotes(DEFAULT_VALUES);
  assert.match(notes, /healthz/);
  assert.match(notes, /3\.\.18/);
});