import {
  buildGraph,
  validateConfig,
  DEFAULT_CONFIG,
} from "./model.ts";
import type {
  GraphRAGWebConfig,
  KnowledgeGraph,
} from "./model.ts";
import {
  renderHelp,
  renderGraphML,
  renderLocalReport,
  renderGlobalReport,
  renderCommunitiesReport,
  renderValidation,
} from "./render.ts";

export function runLocal(
  config: GraphRAGWebConfig,
  graph: KnowledgeGraph,
  entity: string,
): string {
  return renderLocalReport(config, graph, entity);
}

export function runGlobal(
  config: GraphRAGWebConfig,
  graph: KnowledgeGraph,
): string {
  return renderGlobalReport(config, graph);
}

export function runCommunities(
  config: GraphRAGWebConfig,
  graph: KnowledgeGraph,
): string {
  return renderCommunitiesReport(config, graph);
}

export function main(args: string[]): string {
  const config: GraphRAGWebConfig = DEFAULT_CONFIG;
  const problems = validateConfig(config);
  if (problems.length > 0) return renderValidation(config, problems) + runGlobal(config, buildGraph(config));
  const cmd = args[0] ?? "help";
  switch (cmd) {
    case "graph":
      return renderGraphML(config, buildGraph(config));
    case "local":
      return runLocal(config, buildGraph(config), args[1] ?? "gateway");
    case "global":
      return runGlobal(config, buildGraph(config));
    case "communities":
      return runCommunities(config, buildGraph(config));
    case "validate":
      return renderValidation(config, problems);
    default:
      return renderHelp(config);
  }
}
