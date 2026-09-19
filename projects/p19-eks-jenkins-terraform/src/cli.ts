import { parseArgs } from "node:util";
import { writeFileSync } from "node:fs";
import { validateConfig, DEFAULT_CONFIG } from "./model.ts";
import {
  braceBalance,
  decideApply,
  renderApplySheet,
  renderMainTf,
  renderOutputsTf,
} from "./terraform.ts";

const { values } = parseArgs({
  options: {
    check: { type: "boolean", short: "c" },
    render: { type: "boolean", short: "r" },
    plan: { type: "boolean", short: "p" },
    sheet: { type: "boolean", short: "s" },
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

function runCheck(): void {
  const problems: string[] = [];
  const expect = (label: string, actual: unknown, wanted: unknown) => {
    if (actual !== wanted) problems.push(`${label}: expected ${wanted}, got ${actual}`);
  };

  expect("default config valid", validateConfig(DEFAULT_CONFIG).length, 0);

  const main = renderMainTf(DEFAULT_CONFIG);
  const outputs = renderOutputsTf(DEFAULT_CONFIG);
  const all = main + outputs;
  expect("braces balanced", braceBalance(all), true);
  for (const fragment of ["provider \"aws\"", "resource \"aws_eks_cluster\" \"this\"", "resource \"aws_eks_node_group\" \"this\"", "resource \"helm_release\" \"jenkins\"", "backend \"s3\""]) {
    if (!all.includes(fragment)) problems.push(`rendered tf is missing ${fragment}`);
  }

  const created = decideApply(DEFAULT_CONFIG, { nodesRunning: 0, version: undefined, jenkinsDeployed: false });
  expect("empty cluster -> create", created.action, "create");
  const update = decideApply(DEFAULT_CONFIG, { nodesRunning: 2, version: "1.30", jenkinsDeployed: false });
  expect("drift -> update", update.action, "update");
  const noop = decideApply(DEFAULT_CONFIG, { nodesRunning: 3, version: "1.32", jenkinsDeployed: true });
  expect("converged -> noop", noop.action, "noop");

  if (/AKIA[0-9A-Z]{16}|password\s*[:=]\s*["'][^"']+["']/.test(all)) {
    problems.push("rendered tf carries a credential-shaped string");
  }

  if (problems.length === 0) {
    console.log("terraform: PASS (eks stack, apply plan, aws provider)");
  } else {
    for (const problem of problems) {
      console.error(`terraform: ${problem}`);
    }
    process.exitCode = 1;
  }
}

if (values.check) {
  runCheck();
} else if (values.render) {
  writeOrPrint(values.out, renderMainTf(DEFAULT_CONFIG) + "\n" + renderOutputsTf(DEFAULT_CONFIG));
} else if (values.plan) {
  const decision = decideApply(DEFAULT_CONFIG, { nodesRunning: 2, version: "1.30", jenkinsDeployed: false });
  writeOrPrint(values.out, `action: ${decision.action}\n${decision.reasons.join("\n")}\n`);
} else if (values.sheet) {
  writeOrPrint(values.out, renderApplySheet(DEFAULT_CONFIG));
} else {
  runCheck();
}