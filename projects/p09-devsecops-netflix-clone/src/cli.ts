import { parseArgs } from "node:util";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SAST_RULES, scanText } from "./sast.ts";
import { defaultStore, validateItem } from "./catalog.ts";
import { defaultPipeline, renderWorkflow, renderCheatSheet } from "./pipeline.ts";
import { startAppServer } from "./app.ts";

const { values } = parseArgs({
  options: {
    check: { type: "boolean", short: "c" },
    workflow: { type: "boolean", short: "w" },
    notes: { type: "boolean", short: "n" },
    serve: { type: "string" },
    out: { type: "string", short: "o" },
  },
});

const projectRoot = join(import.meta.dirname, "..");
const SCANNED_APP_FILES = ["src/catalog.ts", "src/app.ts", "src/pipeline.ts"];

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

  const catalog = defaultStore();
  for (const item of catalog.list) {
    for (const problem of validateItem(item)) {
      problems.push(problem);
    }
  }

  for (const fileName of SCANNED_APP_FILES) {
    const text = readFileSync(join(projectRoot, fileName), "utf8");
    for (const finding of scanText(text)) {
      problems.push(`${finding.rule} ${fileName}:${finding.line} ${finding.evidence}`);
    }
  }

  if (problems.length === 0) {
    console.log(`sast: PASS (${SCANNED_APP_FILES.length} files clean, ${SAST_RULES.length} rules)`);
    process.exitCode = 0;
  } else {
    for (const p of problems) {
      console.error(`sast: ${p}`);
    }
    process.exitCode = 1;
  }
}

if (values.check || (!values.workflow && !values.notes && !values.serve)) {
  runCheck();
} else if (values.serve) {
  const port = Number(values.serve);
  if (Number.isNaN(port) || port < 1 || port > 65535) {
    console.error("--serve expects a valid port number");
    process.exitCode = 1;
  } else {
    startAppServer(port);
  }
} else {
  const pipeline = defaultPipeline();
  if (values.workflow) {
    writeOrPrint(values.out, renderWorkflow(pipeline));
  }
  if (values.notes) {
    writeOrPrint(values.out, renderCheatSheet(pipeline));
  }
}