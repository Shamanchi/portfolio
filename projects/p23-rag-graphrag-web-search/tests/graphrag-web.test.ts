import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_CONFIG,
  tokenize,
  buildCounter,
  extractEntities,
  extractRelations,
  buildGraph,
  neighbors,
  enumerateCommunities,
  localSearch,
  globalTopics,
  validateConfig,
} from "../src/model.ts";
import type { GraphRAGWebConfig } from "../src/model.ts";
import {
  renderHelp,
  renderGraphML,
  renderValidation,
} from "../src/render.ts";
import { runLocal, runGlobal, runCommunities, main } from "../src/cli.ts";

const graph = buildGraph(DEFAULT_CONFIG);

test("tokenize splits and lowercases", () => {
  const words = tokenize("API Gateway routes to auth via Redis");
  assert.ok(words.includes("gateway"));
  assert.ok(words.includes("redis"));
});

test("buildCounter tallies", () => {
  const c = buildCounter(["a", "b", "a"]);
  assert.equal(c.get("a"), 2);
  assert.equal(c.get("b"), 1);
});

test("extractEntities finds corp entity types", () => {
  const found = extractEntities("api-gateway routes to auth", DEFAULT_CONFIG);
  assert.ok(found.length > 0);
});

test("extractRelations tags markers", () => {
  const kinds = extractRelations("redirects", DEFAULT_CONFIG);
  assert.ok(kinds.length >= 0);
});

test("buildGraph creates graph", () => {
  assert.ok(graph.entities.size > 0);
  assert.ok(graph.relations.length > 0);
});

test("neighbors both directions", () => {
  const first = graph.relations[0];
  const nf = neighbors(graph, first.from);
  const nt = neighbors(graph, first.to);
  assert.ok(nf.includes(first.to));
  assert.ok(nt.includes(first.from));
});

test("enumerateCommunities clusters", () => {
  const clusters = enumerateCommunities(graph, DEFAULT_CONFIG.maxCommunities);
  assert.ok(clusters.length > 0);
});

test("localSearch bounded", () => {
  const hits = localSearch(graph, "gateway", DEFAULT_CONFIG.localSearchLimit);
  assert.ok(hits.length > 0);
  assert.ok(hits.length <= DEFAULT_CONFIG.localSearchLimit);
});

test("globalTopics bounded", () => {
  const topics = globalTopics(graph, DEFAULT_CONFIG.globalTopicLimit);
  assert.ok(Array.isArray(topics));
});

test("validateConfig accepts defaults", () => {
  assert.deepEqual(validateConfig(DEFAULT_CONFIG), []);
});

test("renderers produce text", () => {
  assert.ok(renderHelp(DEFAULT_CONFIG).length > 0);
  assert.ok(renderGraphML(DEFAULT_CONFIG, graph).includes("<graphml"));
  assert.ok(renderValidation(DEFAULT_CONFIG, []).length > 0);
});

test("cli local renders report", () => {
  assert.ok(runLocal(DEFAULT_CONFIG, graph, "gateway").includes("local"));
});

test("cli global renders topics", () => {
  assert.ok(runGlobal(DEFAULT_CONFIG, graph).length > 0);
});

test("cli communities renders", () => {
  assert.ok(runCommunities(DEFAULT_CONFIG, graph).length > 0);
});

test("cli main dispatches graph", () => {
  assert.ok(main(["--graph"]).includes("p23"));
});
