import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_CONFIG,
  tokenize,
  buildCounter,
  extractEntities,
  detectRelations,
  buildGraph,
  neighbors,
  enumerateCommunities,
  localSearch,
  globalTopics,
  validateConfig,
} from "../src/model.ts";
import type { GraphRAGConfig } from "../src/model.ts";
import {
  renderHelp,
  renderGraphML,
  renderValidation,
} from "../src/render.ts";
import { runLocal, runGlobal, runCommunities, main } from "../src/cli.ts";

const graph = buildGraph(DEFAULT_CONFIG);

test("tokenize lowercases and splits words", () => {
  const words = tokenize("API Gateway routes to auth via Redis");
  assert.ok(words.includes("gateway"));
  assert.ok(words.includes("redis"));
});

test("buildCounter counts frequencies", () => {
  const c = buildCounter(["a", "b", "a"]);
  assert.equal(c.get("a"), 2);
  assert.equal(c.get("b"), 1);
});

test("extractEntities finds entity types from corpus", () => {
  const entities = extractEntities("api-gateway routes to the auth service via redis", DEFAULT_CONFIG);
  assert.ok(entities.length > 0);
});

test("detectRelations tags known relation markers", () => {
  const kinds = detectRelations("orders-service publishes events to kafka", DEFAULT_CONFIG);
  assert.ok(kinds.includes("publishes_to"));
});

test("buildGraph produces entities and relations", () => {
  assert.ok(graph.entities.size > 0);
  assert.ok(graph.relations.length > 0);
});

test("neighbors returns both directions", () => {
  const first = graph.relations[0];
  assert.ok(neighbors(graph, first.from).includes(first.to));
  assert.ok(neighbors(graph, first.to).includes(first.from));
});

test("enumerateCommunities clusters connected components", () => {
  const communities = enumerateCommunities(graph, DEFAULT_CONFIG.maxCommunities);
  assert.ok(communities.length > 0);
});

test("localSearch returns entities with limit", () => {
  const found = localSearch(graph, "gateway", DEFAULT_CONFIG.localSearchLimit);
  assert.ok(found.length > 0);
  assert.ok(found.length <= DEFAULT_CONFIG.localSearchLimit);
});

test("globalTopics sorts relation kinds by frequency", () => {
  const topics = globalTopics(graph, DEFAULT_CONFIG.globalTopicLimit);
  assert.ok(Array.isArray(topics));
});

test("validateConfig accepts the default config", () => {
  assert.deepEqual(validateConfig(DEFAULT_CONFIG), []);
});

test("validateConfig flags empty corpus", () => {
  const bad = { ...DEFAULT_CONFIG, corpus: [] };
  assert.ok(validateConfig(bad).some((p) => p.toLowerCase().includes("corpus")));
});

test("renderHelpers render without throwing", () => {
  assert.ok(renderHelp(DEFAULT_CONFIG).length > 0);
  assert.ok(renderValidation(DEFAULT_CONFIG, []).length > 0);
  assert.ok(renderGraphML(DEFAULT_CONFIG, graph).includes("<graphml"));
});

test("cli local command renders a report", () => {
  const report = runLocal(DEFAULT_CONFIG, graph, "gateway");
  assert.ok(report.includes("local search"));
});

test("cli global command renders topics", () => {
  const report = runGlobal(DEFAULT_CONFIG, graph);
  assert.ok(report.length > 0);
});

test("cli communities command renders communities", () => {
  const report = runCommunities(DEFAULT_CONFIG, graph);
  assert.ok(report.length > 0);
});

test("cli main dispatches graph command", () => {
  const out = main(["--graph"]);
  assert.ok(out.includes("p22"));
});
