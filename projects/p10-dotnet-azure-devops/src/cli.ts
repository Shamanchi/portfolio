import { parseArgs } from "node:util";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { defaultModel, validateModel } from "./model.ts";
import { SAMPLE_CSPROJ, validateCsproj } from "./xml.ts";
import { renderNotes, renderPipeline } from "./pipeline.ts";

const { values } = parseArgs({
  options: {
    check: { type: "boolean", short: "c" },
    workflow: { type: "boolean", short: "w" },
    notes: { type: "boolean", short: "n" },
    out: { type: "string", short: "o" },
  },
});

const projectRoot = join(import.meta.dirname, "..");
const SCRIPTS = ["src/cli.ts", "src/model.ts", "src/pipeline.ts", "src/xml.ts"];
const SECRET_PATTERN = /\b(api[_-]?)?(key|secret|password|token)\b\s*[=:]\s*["'][A-Za-z0-9]{12,}["']/gi;

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

  const model = defaultModel();
  for (const problem of validateModel(model)) {
    problems.push(`model: ${problem}`);
  }

  const csproj = validateCsproj(SAMPLE_CSPROJ, model.framework);
  for (const problem of csproj.problems) {
    problems.push(`csproj: ${problem}`);
  }

  const pipeline = renderPipeline(model);
  for (const fileName of SCRIPTS) {
    const text = readFileSync(join(projectRoot, fileName), "utf8");
    for (const match of text.matchAll(SECRET_PATTERN)) {
      problems.push(`${fileName}: possible secret ${match[0]}`);
    }
  }
  for (const match of pipeline.matchAll(SECRET_PATTERN)) {
    problems.push(`pipeline: possible secret ${match[0]}`);
  }

  if (problems.length === 0) {
    console.log("check: PASS (model, csproj and generated pipeline are clean)");
    process.exitCode = 0;
  } else {
    for (const problem of problems) {
      console.error(`check: ${problem}`);
    }
    process.exitCode = 1;
  }
}

if (values.check || (!values.workflow && !values.notes)) {
  runCheck();
} else {
  const model = defaultModel();
  if (values.workflow) {
    writeOrPrint(values.out, renderPipeline(model));
  }
  if (values.notes) {
    writeOrPrint(values.out, renderNotes(model));
  }
}