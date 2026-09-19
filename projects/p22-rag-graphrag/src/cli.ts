import { DEFAULT_CONFIG, validateConfig } from "./model.ts";
import type { GraphRAGConfig, KnowledgeGraph } from "./model.ts";
import {
  localSearch,
  globalTopics,
  enumerateCommunities,
  buildGraph,
} from "./model.ts";
import {
  renderHelp,
  renderValidation,
  renderGraphML,
  renderLocalReport,
  renderGlobalReport,
  renderCommunities,
} from "./render.ts";

export function runCheck(config: GraphRAGConfig, graph: KnowledgeGraph): string {
  const problems = validateConfig(config);
  return renderValidation(config, problems) + `entities: ${graph.entities.size}; relations: ${graph.relations.length}\n`;
}

export function runLocal(config: GraphRAGConfig, graph: KnowledgeGraph, entity: string): string {
  return renderLocalReport(config, graph, entity, config.localSearchLimit);
}

export function runGlobal(config: GraphRAGConfig, graph: KnowledgeGraph): string {
  return renderGlobalReport(config, graph, config.globalTopicLimit);
}

export function runCommunities(config: GraphRAGConfig, graph: KnowledgeGraph): string {
  return renderCommunities(config, graph, config.maxCommunities);
}

export function runGraph(config: GraphRAGConfig, graph: KnowledgeGraph): string {
  return `#p22-rag-graphrag GraphML ${graph.entities.size} nodes ${graph.relations.length} edges\n` + renderGraphML(config, graph);
}

export function main(argv: string[]): string {
  const config = { ...DEFAULT_CONFIG };
  const graph = buildGraph(config);
  const command = argv[0] ?? "check";
  switch (command) {
    case "help":
      return renderHelp(config);
    case "check":
    case "validate":
      return runCheck(config, graph);
    case "local":
      return runLocal(config, graph, argv[1] ?? "gateway");
    case "topics":
    case "global":
      return runGlobal(config, graph);
    case "communities":
      return runCommunities(config, graph);
    case "graph":
      return runGraph(config, graph);
    default:
      return `unknown command: ${command}\n` + renderHelp(config);
  }
}

if (import.meta.main) {
  console.log(main(process.argv.slice(2)));
}
