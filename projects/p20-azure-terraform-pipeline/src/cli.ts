import { parseArgs } from "node:util";
import { writeFileSync } from "node:fs";
import { validateConfig, DEFAULT_CONFIG, backendKey, planGate } from "./model.ts";
import { renderCheatSheet, renderMainTf, renderPipeline } from "./azurerm.ts";

const { values } = parseArgs({
  options: {
    check: { type: "boolean", short: "c" },
    render: { type: "boolean", short: "r" },
    plan: { type: "boolean", short: "p" },
    key: { type: "boolean", short: "k" },
    sheet: { type: "boolean", short: "s" },
    out: { type: "string", short: "o" },
    scope: { type: "string" },
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

function runCheck(): void {
  const problems: string[] = [];
  const expect = (label: string, actual: unknown, wanted: unknown) => {
    if (actual !== wanted) problems.push(`${label}: expected ${wanted}, got ${actual}`);
  };

  expect("default config valid", validateConfig(DEFAULT_CONFIG).length, 0);

  const tf = renderMainTf(DEFAULT_CONFIG);
  const pipeline = renderPipeline(DEFAULT_CONFIG);
  for (const fragment of ["provider \"azurerm\"", "resource \"azurerm_storage_account\" \"state\"", "backend \"azurerm\""]) {
    if (!tf.includes(fragment)) problems.push(`main.tf is missing ${fragment}`);
  }
  for (const fragment of ["terraform init", "dev-approval", "terraform apply"]) {
    if (!pipeline.includes(fragment)) problems.push(`pipeline is missing ${fragment}`);
  }

  expect("plan with changes applies", planGate("Plan: 2 to add, 1 to change, 0 to destroy.", "dev").apply, true);
  expect("empty plan is a noop", planGate("No changes. Infrastructure is up-to-date.", "dev").apply, false);
  expect("prod refuses destroys", planGate("Plan: 0 to add, 0 to change, 3 to destroy.", "prod").apply, false);

  expect("backend keys are namespaced", backendKey("acme", "Kubernetes Cluster", "infra"), "acme/kubernetes-cluster/infra.tfstate");

  if (/AKIA[0-9A-Z]{16}|password\s*[:=]\s*["'][^"']+["']/.test(tf + pipeline)) {
    problems.push("rendered infra carries a credential-shaped string");
  }

  if (problems.length === 0) {
    console.log("terraform-azure: PASS (azurerm stack, plan gate, backend keys)");
  } else {
    for (const problem of problems) {
      console.error(`terraform-azure: ${problem}`);
    }
    process.exitCode = 1;
  }
}

if (values.check) {
  runCheck();
} else if (values.render) {
  writeOrPrint(values.out, renderMainTf(DEFAULT_CONFIG) + "\n" + renderPipeline(DEFAULT_CONFIG));
} else if (values.plan) {
  const gate = planGate("Plan: 1 to add, 0 to change, 0 to destroy.", DEFAULT_CONFIG.environment);
  writeOrPrint(values.out, `apply: ${gate.apply}\n${gate.reason}\n`);
} else if (values.key) {
  writeOrPrint(values.out, backendKey(DEFAULT_CONFIG.workspace, "app-service", values.scope ?? "infra") + "\n");
} else if (values.sheet) {
  writeOrPrint(values.out, renderCheatSheet(DEFAULT_CONFIG));
} else {
  runCheck();
}