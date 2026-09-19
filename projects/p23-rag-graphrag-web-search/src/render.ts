import {
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
} from "./model.ts";
import type {
  Entity,
  Relation,
  KnowledgeGraph,
  GraphRAGWebConfig,
} from "./model.ts";

export function renderHelp(config: GraphRAGWebConfig): string {
  const lang = config.language === "ru" ? "русский" : "english";
  return [
    "p23-rag-graphrag-web-search — offline web-search GraphRAG demo",
    "no external API, no network: corpus + tokenization only",
    "language: " + lang,
    "commands:",
    "  help",
    "  validate",
    "  graph",
    "  local <ENTITY>",
    "  global",
    "  communities",
    "  search <QUERY>",
  ].join("\n") + "\n";
}

function graphMLNodes(graph: KnowledgeGraph): string[] {
  const out: string[] = [];
  for (const entity of graph.entities.values()) {
    out.push(
      '<node id="' + entity.name + '"><data key="kind">' +
      entity.kind + "</data></node>"
    );
  }
  return out;
}

function graphMLEdges(graph: KnowledgeGraph): string[] {
  const out: string[] = [];
  for (const rel of graph.relations) {
    out.push(
      '<edge source="' + rel.from + '" target="' + rel.to +
      '"><data key="rel">' + rel.kind + "</data></edge>"
    );
  }
  return out;
}

export function renderGraphML(config: GraphRAGWebConfig, graph: KnowledgeGraph): string {
  const nodes = graphMLNodes(graph).join("\n");
  const edges = graphMLEdges(graph).join("\n");
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">',
    '  <key id="kind" for="node" attr.name="kind" attr.type="string"/>',
    '  <key id="rel" for="edge" attr.name="relation" attr.type="string"/>',
    '  <graph edgedefault="undirected">',
    nodes,
    edges,
    "  </graph>",
    "</graphml>",
    "",
  ].join("\n");
}

function buildNodeTags(graph: KnowledgeGraph): string[] {
  return [...graph.entities.values()].map(
    (e: Entity) => `      <node id="${e.name}"><data key="kind">${e.kind}</data></node>`,
  );
}

function buildEdgeTags(graph: KnowledgeGraph): string[] {
  return graph.relations.map(
    (r: Relation) =>
      `      <edge source="${r.from}" target="${r.to}"><data key="rel">${r.kind}</data></edge>`,
  );
}

export function renderGraphMLView(config: GraphRAGWebConfig, graph: KnowledgeGraph): string {
  const nodeTags = buildNodeTags(graph).join("\n");
  const edgeTags = buildEdgeTags(graph).join("\n");
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
  config: GraphRAGWebConfig,
  graph: KnowledgeGraph,
  entity: string,
): string {
  const found = localSearch(graph, entity, config.localSearchLimit);
  if (found.length === 0) return `local "${entity}": no results\n`;
  return (
    `local "${entity}" (limit ${config.localSearchLimit}):\n` +
    found
      .map((e: Entity) => `  - ${e.name} (${e.kind}); sources: ${e.sources.length}`)
      .join("\n") +
    "\n"
  );
}

export function renderGlobalReport(
  config: GraphRAGWebConfig,
  graph: KnowledgeGraph,
): string {
  const topics = globalTopics(graph, config.globalTopicLimit);
  if (topics.length === 0) return "global: no topics\n";
  return (
    `global topics (limit ${config.globalTopicLimit}):\n` +
    topics.map((t: string) => "  - " + t).join("\n") +
    "\n"
  );
}

export function renderCommunitiesReport(
  config: GraphRAGWebConfig,
  graph: KnowledgeGraph,
): string {
  const clusters = enumerateCommunities(graph, config.maxCommunities);
  if (clusters.length === 0) return "communities: none\n";
  return (
    `communities (max ${config.maxCommunities}):\n` +
    clusters
      .map((c: string[], i: number) => `  #${i + 1}: ${c.join(", ")}`)
      .join("\n") +
    "\n"
  );
}

export function renderSearchReport(
  config: GraphRAGWebConfig,
  graph: KnowledgeGraph,
  query: string,
): string {
  const words = buildCounter(tokenize(query));
  let score = 0;
  for (const entity of graph.entities.values()) {
    if (words.has(entity.name)) score += 1;
  }
  const top = localSearch(graph, query, config.searchResultsLimit);
  return [
    `search "${query}" (score ${score}):`,
    ...top.map((e: Entity) => `  - ${e.name} (${e.kind})`),
    "",
  ].join("\n");
}

export function renderValidation(
  config: GraphRAGWebConfig,
  problems: string[],
): string {
  if (problems.length === 0) return "validation: OK\n";
  return "validation problems:\n" + problems.map((p) => "  - " + p).join("\n") + "\n";
}

export function renderJobs(config: GraphRAGWebConfig, graph: KnowledgeGraph): string[] {
  return [
    renderHelp(config),
    renderValidation(config, validateConfig(config)),
    renderGraphML(config, graph),
    renderLocalReport(config, graph, "gateway"),
    renderGlobalReport(config, graph),
    renderCommunitiesReport(config, graph),
    renderSearchReport(config, graph, "redis session"),
  ];
}
