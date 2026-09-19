import { parseArgs } from "node:util";
import { writeFileSync } from "node:fs";
import { validateConfig, DEFAULT_CONFIG, stageOrder, canStartStage } from "./model.ts";
import {
  renderApprovalStage,
  renderCheatSheet,
  renderPipeline,
  renderBuildSpec,
} from "./codepipeline.ts";

const { values } = parseArgs({
  options: {
    check: { type: "boolean", short: "c" },
    render: { type: "boolean", short: "r" },
    spec: { type: "boolean", short: "s" },
    sheet: { type: "boolean", short: "e" },
    gate: { type: "boolean", short: "g" },
    out: { type: "string", short: "o" },
  },
});

function printOut(out: string | undefined, content: string): void {
  if (out) {
    writeFileSync(out, content, "utf8");
    console.log(`wrote ${out}`);
  } else {
    process.stdout.write(content + "\n");
  }
}

function runCheck(): void {
  const problems: string[] = [];
  const expect = (label: string, got: unknown, want: unknown) => {
    if (got !== want) problems.push(`${label}: wanted ${want}, got ${got}`);
  };

  const validation = validateConfig(DEFAULT_CONFIG);
  expect("default valid", validation.length, 0);
  const pipeline = renderPipeline(DEFAULT_CONFIG);
  for (const fragment of ["Source", "Build", "Staging", "ProdApproval", "Deploy", "AWS::CodePipeline::Pipeline"]) {
    if (!pipeline.includes(fragment)) problems.push(`pipeline missing ${fragment}`);
  }
  const spec = renderBuildSpec(DEFAULT_CONFIG);
  for (const fragment of ["npm ci", "npm test", "version: 0.2"]) {
    if (!spec.includes(fragment)) problems.push(`buildspec missing ${fragment}`);
  }
  const approval = renderApprovalStage(DEFAULT_CONFIG);
  for (const fragment of ["category: Approval", "provider: Manual", "sns"]) {
    if (!approval.includes(fragment)) problems.push(`approval missing ${fragment}`);
  }

  expect("fixed order", stageOrder(DEFAULT_CONFIG).join("|"), "Source|Build|Staging|ProdApproval|Deploy");
  expect("deploy blocked without gate", canStartStage(DEFAULT_CONFIG, "Deploy", ["Staging", "Build", "Source"]), false);

  const joined = pipeline + spec + approval;
  if (/(?:AKIA[0-9A-Z]{16}|password\s*[:=]|ghp_[A-Za-z0-9]{20,}|arn:aws:iam::[0-9]{12}:user\/.+)/.test(joined)) {
    problems.push("renders a credential-shaped string");
  }

  if (problems.length === 0) {
    console.log("codepipeline: PASS (source, build, approval gate, deploy)");
  } else {
    for (const p of problems) console.error(`codepipeline: ${p}`);
    process.exitCode = 1;
  }
}

if (values.check) {
  runCheck();
} else if (values.render) {
  printOut(values.out, renderPipeline(DEFAULT_CONFIG));
} else if (values.spec) {
  printOut(values.out, renderBuildSpec(DEFAULT_CONFIG));
} else if (values.sheet) {
  printOut(values.out, renderCheatSheet(DEFAULT_CONFIG));
} else if (values.gate) {
  printOut(values.out, `gate closed: ${canStartStage(DEFAULT_CONFIG, "Deploy", ["Staging", "Build", "Source"])}`);
} else {
  runCheck();
}
