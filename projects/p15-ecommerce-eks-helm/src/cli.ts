import { parseArgs } from "node:util";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { validateValues, DEFAULT_VALUES, type ChartValues } from "./model.ts";
import { renderChart, renderValuesYaml, RenderError } from "./chart.ts";
import { renderEksPlan, renderReadinessNotes, DEFAULT_EKS_PLAN } from "./eks.ts";

const { values } = parseArgs({
  options: {
    check: { type: "boolean", short: "c" },
    charts: { type: "boolean" },
    values: { type: "boolean", short: "v" },
    notes: { type: "boolean", short: "n" },
    out: { type: "string", short: "o" },
    set: { type: "string" },
  },
});

function runCheck(): void {
  const problems: string[] = [];
  const expect = (label: string, actual: unknown, wanted: unknown) => {
    if (actual !== wanted) problems.push(`${label}: expected ${wanted}, got ${actual}`);
  };

  expect("default values valid", validateValues(DEFAULT_VALUES).length, 0);

  const files = renderChart(DEFAULT_VALUES, "shop");
  const names = files.map((file) => file.path).sort();
  for (const expected of ["Chart.yaml", "templates/deployment.yaml", "templates/hpa.yaml", "templates/ingress.yaml"]) {
    if (!names.includes(expected)) problems.push(`chart is missing ${expected}`);
  }

  const deployment = files.find((file) => file.path === "templates/deployment.yaml")?.content ?? "";
  expect("rendered replicas", /\n  replicas: 3\n/.test(deployment), true);
  expect("rendered image", /image: "ghcr\.io\/shamanchi\/ecommerce-api:1\.4\.2"/.test(deployment), true);

  const plan = renderEksPlan(DEFAULT_EKS_PLAN, DEFAULT_VALUES);
  if (/\bAKIA[0-9A-Z]{16}\b|----BEGIN PRIVATE KEY----/.test(plan)) problems.push("eks plan carries a credential-shaped string");

  const rendered = files.map((file) => file.content).join("\n");
  if (/ANDROID|KEYSTORE|AKIA[0-9A-Z]{16}/.test(rendered)) problems.push("rendered chart carries a credential-shaped string");
  if (/{{/.test(rendered)) problems.push("rendered chart still contains template expressions");

  if (problems.length === 0) {
    console.log("chart: PASS (values ok, templates rendered, eks plan)");
  } else {
    for (const problem of problems) {
      console.error(`chart: ${problem}`);
    }
    process.exitCode = 1;
  }
}

function applySet(override: string | undefined): ChartValues {
  if (override === undefined) return DEFAULT_VALUES;
  const [key, raw] = override.split("=");
  if (key === undefined || raw === undefined) {
    console.error("--set expects key=value");
    process.exitCode = 1;
    return DEFAULT_VALUES;
  }
  const value: ChartValues = structuredClone(DEFAULT_VALUES);
  const segments = key.split(".");
  let cursor: Record<string, unknown> = value as unknown as Record<string, unknown>;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index]!;
    const next = cursor[segment];
    if (typeof next !== "object" || next === null) {
      console.error(`unknown path ${key}`);
      process.exitCode = 1;
      return DEFAULT_VALUES;
    }
    cursor = next as Record<string, unknown>;
  }
  const leaf = segments[segments.length - 1]!;
  const numeric = Number(raw);
  cursor[leaf] = Number.isNaN(numeric) ? (raw === "true" ? true : raw === "false" ? false : raw) : numeric;
  return value;
}

if (values.check) {
  runCheck();
} else if (values.charts) {
  const value = applySet(values.set);
  try {
    const files = renderChart(value, "shop");
    const targetDir = values.out ?? "chart";
    mkdirSync(targetDir, { recursive: true });
    for (const file of files) {
      const path = join(targetDir, file.path);
      mkdirSync(join(path, ".."), { recursive: true });
      writeFileSync(path, file.content, "utf8");
    }
    writeFileSync(join(targetDir, "values.yaml"), renderValuesYaml(value), "utf8");
    console.log(`chart written to ${targetDir}`);
  } catch (error) {
    if (error instanceof RenderError) {
      console.error(`chart: ${error.message}`);
      process.exitCode = 1;
    } else {
      throw error;
    }
  }
} else if (values.values) {
  const value = applySet(values.set);
  writeFileSync(values.out ?? "values.yaml", renderValuesYaml(value), "utf8");
  console.log(`values written to ${values.out ?? "values.yaml"}`);
} else if (values.notes) {
  writeFileSync(values.out ?? "EKS_PLAN.md", renderEksPlan(DEFAULT_EKS_PLAN, DEFAULT_VALUES) + "\n" + renderReadinessNotes(DEFAULT_VALUES), "utf8");
  console.log(`plan written to ${values.out ?? "EKS_PLAN.md"}`);
} else {
  runCheck();
}