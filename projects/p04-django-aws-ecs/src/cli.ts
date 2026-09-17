import { parseArgs } from "node:util";
import { writeFileSync } from "node:fs";
import { defaultApp, validate } from "./model.ts";
import { logGroupName, buildTaskDefinition } from "./taskdef.ts";
import { renderTerraform } from "./terraform.ts";

const { values } = parseArgs({
  options: {
    check: { type: "boolean", short: "c" },
    taskdef: { type: "boolean", short: "t" },
    terraform: { type: "boolean", short: "r" },
    out: { type: "string", short: "o" },
  },
});

const app = defaultApp();
const problems = validate(app);

function writeOrPrint(filename: string | undefined, content: string): void {
  if (filename) {
    writeFileSync(filename, content + "\n", "utf8");
    console.log(`wrote ${filename}`);
  } else {
    process.stdout.write(content + "\n");
  }
}

if (values.check || (!values.taskdef && !values.terraform)) {
  if (problems.length === 0) {
    console.log(`model: PASS (${logGroupName(app)} ready)`);
    process.exitCode = 0;
  } else {
    for (const p of problems) {
      console.error(`model: ${p}`);
    }
    console.log(`model: FAIL (${problems.length} problem(s))`);
    process.exitCode = 1;
  }
} else {
  if (values.taskdef) {
    writeOrPrint(values.out, JSON.stringify(buildTaskDefinition(app), null, 2));
  }
  if (values.terraform) {
    writeOrPrint(values.out, renderTerraform(app));
  }
}
