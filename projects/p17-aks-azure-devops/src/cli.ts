import { parseArgs } from "node:util";
import { writeFileSync } from "node:fs";
import { validateConfig, DEFAULT_CONFIG } from "./config.ts";
import { evaluateCluster, renderAksCheatsheet, renderPipeline, type NodeReadiness } from "./aks.ts";

const { values } = parseArgs({
  options: {
    check: { type: "boolean", short: "c" },
    pipeline: { type: "boolean", short: "p" },
    cluster: { type: "boolean", short: "k" },
    notes: { type: "boolean", short: "n" },
    nodes: { type: "string" },
    out: { type: "string", short: "o" },
  },
});

function writeOrPrint(filename: string | undefined, content: string): void {
  if (filename) {
    writeFileSync(filename, content, "utf8");
    console.log(`wrote ${filename}`);
  } else {
    process.stdout.write(content);
  }
}

function parseNodes(flag: string | undefined): NodeReadiness[] {
  if (flag === undefined) {
    return [
      { name: "aks-nodepool1-01", ready: true },
      { name: "aks-nodepool1-02", ready: true },
      { name: "aks-nodepool1-03", ready: true },
      { name: "aks-nodepool1-04", ready: false },
    ];
  }
  return flag.split(",").map((chunk, index) => {
    const [name, state] = chunk.split("=");
    return { name: name ?? `node-${index}`, ready: (state ?? "true") === "true" };
  });
}

function runCheck(): void {
  const problems: string[] = [];
  const expect = (label: string, actual: unknown, wanted: unknown) => {
    if (actual !== wanted) problems.push(`${label}: expected ${wanted}, got ${actual}`);
  };

  expect("default config valid", validateConfig(DEFAULT_CONFIG).length, 0);

  const pipeline = renderPipeline(DEFAULT_CONFIG);
  for (const fragment of [
    "az acr build",
    "helm upgrade --install",
    "environment: shop-dev",
    "environment: shop-prod",
    "refs/heads/main",
    DEFAULT_CONFIG.acrServiceConnection,
  ]) {
    if (!pipeline.includes(fragment)) problems.push(`pipeline is missing ${fragment}`);
  }

  const healthy = evaluateCluster([{ name: "n1", ready: true }, { name: "n2", ready: true }], 2);
  expect("two ready nodes -> healthy", healthy.status, "healthy");
  const degraded = evaluateCluster([{ name: "n1", ready: true }, { name: "n2", ready: true }, { name: "n3", ready: true }, { name: "n4", ready: false }], 3);
  expect("capacity above floor with a down node -> degraded", degraded.status, "degraded");
  const unready = evaluateCluster([{ name: "n1", ready: true }, { name: "n2", ready: false }], 3);
  expect("below the floor -> unready", unready.status, "unready");

  if (/password\s*[:=]\s*["'][^"']+["']|AKIA[0-9A-Z]{16}|azureCLI.*login.*["']/.test(pipeline)) {
    problems.push("pipeline carries a credential-shaped string");
  }

  if (problems.length === 0) {
    console.log("pipeline: PASS (azure devops, aks readiness)");
  } else {
    for (const problem of problems) {
      console.error(`pipeline: ${problem}`);
    }
    process.exitCode = 1;
  }
}

if (values.check) {
  runCheck();
} else if (values.pipeline) {
  writeOrPrint(values.out, renderPipeline(DEFAULT_CONFIG));
} else if (values.cluster) {
  const evaluation = evaluateCluster(parseNodes(values.nodes), DEFAULT_CONFIG.requiredNodes);
  writeOrPrint(values.out, `status: ${evaluation.status}\n${evaluation.reason}\n`);
} else if (values.notes) {
  writeOrPrint(values.out, renderAksCheatsheet(DEFAULT_CONFIG));
} else {
  runCheck();
}