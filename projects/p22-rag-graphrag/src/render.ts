import {
  localSearch,
  globalTopics,
  enumerateCommunities,
} from "./model.ts";
import type {
  Entity,
  Relation,
  KnowledgeGraph,
  GraphRAGConfig,
} from "./model.ts";

export function renderHelp(config: GraphRAGConfig): string {
  const lang = config.language === "ru" ? "русский" : "english";
  return `p22-rag-graphrag — GraphRAG over a shop-services corpus (no external API, runs offline).
language: ${lang}
commands:
  help
  validate
  graph             emit GraphML
  local <entity>    local search around an entity
  topics            global topics by relation frequency
  communities       connected-component communities
`;
}

function collectNodes(graph: KnowledgeGraph): { nodeTag: string }[] {
  return [...graph.entities.values()].map((e: Entity) => ({
    nodeTag: `      <node id="${e.name}"><data key="kind">${e.kind}</data></node>`,
  }));
}

function collectEdges(graph: KnowledgeGraph): string[] {
  return graph.relations.map(
    (r: Relation) =>
      `      <edge source="${r.from}" target="${r.to}"><data key="rel">${r.kind}</data></edge>`,
  );
}

export function renderGraphML(config: GraphRAGConfig, graph: KnowledgeGraph): string {
  const nodeTags = collectNodes(graph).map((n) => n.nodeTag).join("\n");
  const edgeTags = collectEdges(graph).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="kind" for="node" attr.name="kind" attr.type="string"/>
  <key id="rel" for="edge" attr.name="relation" attr.type="string"/>
  <graph edgedefault="undirected">
${nodeTags}
${edgeTags}
  </graph>
</graphml>
`;
}

export function renderLocalReport(
  config: GraphRAGConfig,
  graph: KnowledgeGraph,
  entity: string,
  limit: number,
): string {
  const found = localSearch(graph, entity, limit);
  if (found.length === 0) return `local search for "${entity}": no results\n`;
  return `local search for "${entity}" (limit ${limit}):\n${found
    .map((e: Entity) => `  - ${e.name} (${e.kind}); sources: ${e.sources.length}`)
    .join("\n")}\n`;
}

export function renderGlobalReport(
  config: GraphRAGConfig,
  graph: KnowledgeGraph,
  limit: number,
): string {
  const topics = globalTopics(graph, limit);
  if (topics.length === 0) return "global topics: none\n";
  return `global topics (limit ${limit}):\n${topics
    .map((t) => `  - ${t}`)
    .join("\n")}\n`;
}

export function renderCommunities(
  config: GraphRAGConfig,
  graph: KnowledgeGraph,
  max: number,
): string {
  const clusters = enumerateCommunities(graph, max);
  if (clusters.length === 0) return "communities: none\n";
  return `communities (max ${max}):\n${clusters
    .map((c, i) => `  [${i}] ${c.join(", ")}`)
    .join("\n")}\n`;
}

export function renderValidation(config: GraphRAGConfig, problems: string[]): string {
  if (problems.length === 0) return "config: OK\n";
  return `config problems:\n${problems.map((p) => `  - ${p}`).join("\n")}\n`;
}
