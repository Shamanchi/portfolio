import { parseArgs } from "node:util";
import { writeFileSync } from "node:fs";
import { defaultPipeline, validate, renderJenkinsfile, renderArtifactNotes } from "./pipeline.ts";
import { defaultDeploymentSpec, renderManifests } from "./manifests.ts";

const { values } = parseArgs({
  options: {
    check: { type: "boolean", short: "c" },
    pipeline: { type: "boolean", short: "p" },
    manifests: { type: "boolean", short: "m" },
    notes: { type: "boolean", short: "n" },
    out: { type: "string", short: "o" },
  },
});

const pipeline = defaultPipeline();
const problems = validate(pipeline);

function writeOrPrint(filename: string | undefined, content: string): void {
  if (filename) {
    writeFileSync(filename, content, "utf8");
    console.log(`wrote ${filename}`);
  } else {
    process.stdout.write(content);
  }
}

if (values.check || (!values.pipeline && !values.manifests && !values.notes)) {
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
  if (values.pipeline) {
    writeOrPrint(values.out, renderJenkinsfile(pipeline));
  }
  if (values.manifests) {
    writeOrPrint(values.out, renderManifests(defaultDeploymentSpec(pipeline)));
  }
  if (values.notes) {
    writeOrPrint(values.out, renderArtifactNotes(pipeline));
  }
}