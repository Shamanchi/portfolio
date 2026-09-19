export interface Entity {
  name: string;
  kind: string;
  sources: string[];
}

export interface Relation {
  from: string;
  to: string;
  kind: string;
  evidence: string[];
}

export interface KnowledgeGraph {
  entities: Map<string, Entity>;
  relations: Relation[];
}

export interface GraphRAGConfig {
  corpus: string[];
  entityTypes: string[];
  relationTypes: string[];
  maxCommunities: number;
  localSearchLimit: number;
  globalTopicLimit: number;
  language: "en" | "ru";
}

export const DEFAULT_CONFIG: GraphRAGConfig = {
  corpus: [
    "api-gateway routes requests to the auth service via redis.",
    "auth-service stores sessions in redis keyed by token.",
    "cart-service keeps items in postgres with row-level locks.",
    "orders-service publishes events to kafka topic shop-orders.",
    "kafka persists events for the audit-service replay.",
  ],
  entityTypes: ["gateway", "service", "store", "queue"],
  relationTypes: ["routes_to", "stores_in", "publishes_to", "depends_on"],
  maxCommunities: 4,
  localSearchLimit: 3,
  globalTopicLimit: 4,
  language: "en",
};

export function tokenize(text: string): string[] {
  const raw = text.toLowerCase().match(/[a-z][a-z0-9_-]{1,24}/g) ?? [];
  const words: string[] = [];
  for (const tok of raw) {
    for (const piece of tok.split("-")) {
      if (piece.length >= 2) words.push(piece);
    }
  }
  return words;
}

export function buildCounter(words: string[]): Map<string, number> {
  const counter = new Map<string, number>();
  for (const w of words) counter.set(w, (counter.get(w) ?? 0) + 1);
  return counter;
}

export function extractEntities(doc: string, config: GraphRAGConfig): Entity[] {
  const found: Entity[] = [];
  const kinds = new Set(config.entityTypes.map((t) => t.toLowerCase()));
  const seen = new Set<string>();
  for (const tok of tokenize(doc)) {
    if (kinds.has(tok) && !seen.has(tok)) {
      seen.add(tok);
      found.push({ name: tok, kind: tok, sources: [doc.slice(0, 32)] });
    }
  }
  return found;
}

export function detectRelations(doc: string, config: GraphRAGConfig): string[] {
  const markers: Record<string, string[]> = {
    routes_to: ["routes", "proxies", "gateway to"],
    stores_in: ["stores", "keeps", "persists"],
    publishes_to: ["publishes", "emits", "pushes"],
    depends_on: ["depends on", "reads from", "calls"],
  };
  const lower = doc.toLowerCase();
  const found: string[] = [];
  for (const kind of config.relationTypes) {
    const hints = markers[kind] ?? [];
    if (hints.some((h) => lower.includes(h))) found.push(kind);
  }
  return found;
}

export function buildGraph(config: GraphRAGConfig): KnowledgeGraph {
  const entities = new Map<string, Entity>();
  const relations: Relation[] = [];
  for (const doc of config.corpus) {
    for (const e of extractEntities(doc, config)) {
      if (!entities.has(e.name)) entities.set(e.name, e);
    }
    const kinds = detectRelations(doc, config);
    const names = [...entities.keys()];
    if (kinds.length > 0 && names.length >= 2) {
      relations.push({
        from: names[0],
        to: names[names.length - 1],
        kind: kinds[0],
        evidence: [doc.slice(0, 32)],
      });
    }
  }
  return { entities, relations };
}

export function neighbors(graph: KnowledgeGraph, name: string): string[] {
  const out = new Set<string>();
  for (const r of graph.relations) {
    if (r.from === name) out.add(r.to);
    if (r.to === name) out.add(r.from);
  }
  return [...out];
}

export function enumerateCommunities(graph: KnowledgeGraph, max: number): string[][] {
  const communities: string[][] = [];
  const visited = new Set<string>();
  for (const name of [...graph.entities.keys()]) {
    if (visited.has(name)) continue;
    const queue = [name];
    visited.add(name);
    const cluster: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift() as string;
      cluster.push(current);
      for (const linked of neighbors(graph, current)) {
        if (!visited.has(linked) && graph.entities.has(linked)) {
          visited.add(linked);
          queue.push(linked);
        }
      }
    }
    communities.push(cluster);
    if (communities.length >= max) break;
  }
  return communities;
}

export function localSearch(graph: KnowledgeGraph, entity: string, limit: number): Entity[] {
  const relevant = new Map<string, Entity>();
  const seed = graph.entities.get(entity);
  if (seed) relevant.set(entity, seed);
  const queue = [entity];
  while (queue.length > 0 && relevant.size < limit) {
    const current = queue.shift() as string;
    relevant.set(current, graph.entities.get(current) as Entity);
    for (const linked of neighbors(graph, current)) {
      if (!relevant.has(linked) && graph.entities.has(linked)) {
        relevant.set(linked, graph.entities.get(linked) as Entity);
        queue.push(linked);
      }
    }
  }
  return [...relevant.values()].slice(0, limit);
}

export function globalTopics(graph: KnowledgeGraph, limit: number): string[] {
  const counts = new Map<string, number>();
  for (const r of graph.relations) counts.set(r.kind, (counts.get(r.kind) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([kind]) => kind);
}

export function validateConfig(config: GraphRAGConfig): string[] {
  const problems: string[] = [];
  if (!Array.isArray(config.corpus) || config.corpus.length === 0) problems.push("corpus is empty");
  if (!Array.isArray(config.entityTypes) || config.entityTypes.length === 0) problems.push("entityTypes is empty");
  if (!Array.isArray(config.relationTypes) || config.relationTypes.length === 0) problems.push("relationTypes is empty");
  if (!Number.isInteger(config.maxCommunities) || config.maxCommunities < 1) problems.push("maxCommunities is invalid");
  if (!Number.isInteger(config.localSearchLimit) || config.localSearchLimit < 1) problems.push("localSearchLimit is invalid");
  if (!Number.isInteger(config.globalTopicLimit) || config.globalTopicLimit < 1) problems.push("globalTopicLimit is invalid");
  if (config.language !== "en" && config.language !== "ru") problems.push("language must be en|ru");
  return problems;
}
