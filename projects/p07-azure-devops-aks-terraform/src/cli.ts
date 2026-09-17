import { parseArgs } from "node:util";
import { writeFileSync } from "node:fs";
import { defaultAks, validate } from "./model.ts";
import { renderTerraform } from "./terraform.ts";
import { renderPipeline, renderCheatSheet } from "./pipeline.ts";

const { values } = parseArgs({
  options: {
    check: { type: "boolean", short: "c" },
    terraform: { type: "boolean", short: "t" },
    pipeline: { type: "boolean", short: "p" },
    notes: { type: "boolean", short: "n" },
    out: { type: "string", short: "o" },
  },
});

const model = defaultAks();
const problems = validate(model);

function writeOrPrint(filename: string | undefined, content: string): void {
  if (filename) {
    writeFileSync(filename, content, "utf8");
    console.log(`wrote ${filename}`);
  } else {
    process.stdout.write(content);
  }
}

if (values.check || (!values.terraform && !values.pipeline && !values.notes)) {
  if (problems.length === 0) {
    console.log("model: PASS");
    process.exitCode = 0;
  } else {
    for (const p of problems) {
      console.error(`model: ${p}`);
    }
    process.exitCode = 1;
  }
} else {
  if (values.terraform) {
    writeOrPrint(values.out, renderTerraform(model));
  }
  if (values.pipeline) {
    writeOrPrint(values.out, renderPipeline(model));
  }
  if (values.notes) {
    writeOrPrint(values.out, renderCheatSheet(model));
  }
}