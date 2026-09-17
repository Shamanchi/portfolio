import { parseArgs } from "node:util";
import { writeFileSync } from "node:fs";
import { defaultPipeline, validate } from "./model.ts";
import { renderCiWorkflow, renderDeployWorkflow } from "./workflow.ts";

const { values } = parseArgs({
  options: {
    check: { type: "boolean", short: "c" },
    ci: { type: "boolean" },
    deploy: { type: "boolean" },
    out: { type: "string", short: "o" },
  },
});

const model = defaultPipeline();
const problems = validate(model);

function writeOrPrint(filename: string | undefined, content: string): void {
  if (filename) {
    writeFileSync(filename, content, "utf8");
    console.log(`wrote ${filename}`);
  } else {
    process.stdout.write(content);
  }
}

if (values.check || (!values.ci && !values.deploy)) {
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
  if (values.ci) {
    writeOrPrint(values.out, renderCiWorkflow(model));
  }
  if (values.deploy) {
    writeOrPrint(values.out, renderDeployWorkflow(model));
  }
}