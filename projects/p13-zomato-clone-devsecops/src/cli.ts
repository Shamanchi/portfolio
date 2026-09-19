import { parseArgs } from "node:util";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { MENU, byCategory, placeOrder, validateMenuItem } from "./catalog.ts";
import { scanText, SA_RULES } from "./sast.ts";
import { DEFAULT_PLAN, renderCheatSheet, renderWorkflow } from "./pipeline.ts";
import { startServer } from "./app.ts";

const { values } = parseArgs({
  options: {
    check: { type: "boolean", short: "c" },
    menu: { type: "boolean", short: "m" },
    workflow: { type: "boolean", short: "w" },
    notes: { type: "boolean", short: "n" },
    serve: { type: "string" },
    out: { type: "string", short: "o" },
  },
});

const projectRoot = join(import.meta.dirname, "..");
const SCANNED_FILES = ["src/app.ts", "src/catalog.ts", "src/pipeline.ts"];

function writeOrPrint(filename: string | undefined, content: string): void {
  if (filename) {
    writeFileSync(filename, content, "utf8");
    console.log(`wrote ${filename}`);
  } else {
    process.stdout.write(content);
  }
}

function detectSecrets(text: string): string[] {
  const problems: string[] = [];
  for (const finding of scanText(text)) {
    if (finding.rule === "S05") continue;
    problems.push(`possible ${SA_RULES[Number(finding.rule.slice(1)) - 1]?.description ?? finding.rule}: "${finding.evidence}"`);
  }
  return problems;
}

function runCheck(): void {
  const problems: string[] = [];

  for (const item of MENU) {
    for (const problem of validateMenuItem(item)) {
      problems.push(`menu ${item.id}: ${problem}`);
    }
  }
  if (byCategory("drinks").length === 0) {
    problems.push("menu has no drinks section");
  }

  for (const fileName of SCANNED_FILES) {
    const text = readFileSync(join(projectRoot, fileName), "utf8");
    problems.push(...detectSecrets(text).map((problem) => `${fileName}: ${problem}`));
  }
  problems.push(...detectSecrets(renderWorkflow(DEFAULT_PLAN)).map((problem) => `workflow: ${problem}`));

  if (problems.length === 0) {
    console.log(`sast: PASS (menu valid, ${SCANNED_FILES.length} sources clean, ${SA_RULES.length} rules)`);
    process.exitCode = 0;
  } else {
    for (const problem of problems) {
      console.error(`sast: ${problem}`);
    }
    process.exitCode = 1;
  }
}

if (values.check || (!values.menu && !values.workflow && !values.notes && !values.serve)) {
  runCheck();
} else if (values.serve) {
  const port = Number(values.serve);
  if (Number.isNaN(port) || port < 1 || port > 65535) {
    console.error("--serve expects a valid port number");
    process.exitCode = 1;
  } else {
    startServer(port);
  }
} else if (values.menu) {
  const total = placeOrder([{ id: "chicken-biryani", quantity: 1 }]);
  const header = total.ok ? `menu (sample order total ${total.total})` : "menu";
  const lines = MENU.map((item) => `${item.id}\t${item.category}\t${item.price.toFixed(2)}\tstock ${item.stock}\t${item.name}`);
  writeOrPrint(values.out, `${header}\n${lines.join("\n")}\n`);
} else {
  const pipeline = DEFAULT_PLAN;
  if (values.workflow) {
    writeOrPrint(values.out, renderWorkflow(pipeline));
  }
  if (values.notes) {
    writeOrPrint(values.out, renderCheatSheet(pipeline));
  }
}