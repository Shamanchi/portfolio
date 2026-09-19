import { parseArgs } from "node:util";
import { writeFileSync } from "node:fs";
import { validateConfig, DEFAULT_CONFIG } from "./model.ts";
import { dockerTag, qualityGate } from "./gates.ts";
import { renderJenkinsfile, renderPipelineNotes } from "./jenkins.ts";

const { values } = parseArgs({
  options: {
    check: { type: "boolean", short: "c" },
    pipeline: { type: "boolean", short: "p" },
    tags: { type: "boolean", short: "t" },
    gate: { type: "boolean", short: "g" },
    notes: { type: "boolean", short: "n" },
    branch: { type: "string" },
    build: { type: "string" },
    coverage: { type: "string" },
    critical: { type: "string" },
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

  const pipeline = renderJenkinsfile(DEFAULT_CONFIG);
  for (const fragment of [
    "mvn -B test",
    "mvn -B spotbugs:check",
    "mvn -B -DskipTests package",
    "docker push",
    "credential",
    "harbor-pusher",
  ]) {
    if (!pipeline.includes(fragment)) problems.push(`jenkinsfile is missing ${fragment}`);
  }

  const passing = qualityGate({ coverage: 91, criticalIssues: 0, requiredCoverage: 80, allowedCritical: 0 });
  expect("green coverage passes", passing.level, "pass");
  const failing = qualityGate({ coverage: 45, criticalIssues: 4, requiredCoverage: 80, allowedCritical: 0 });
  expect("low coverage with criticals fails", failing.level, "fail");
  const warning = qualityGate({ coverage: 78, criticalIssues: 0, requiredCoverage: 80, allowedCritical: 0 });
  expect("near-miss is a warning", warning.level, "warn");

  expect("tag push uses the version", dockerTag("main", "1.4.2", "77", true).join(), "1.4.2");
  expect("release branch gets an rc", dockerTag("release/1.4", "1.4.2", "77", false).join(), "1.4-rc.77,1.4.2");
  expect("feature branch is hashed", dockerTag("feat/my-thing", "1.4.2", "77", false).join(), "feat-my-thing-77");

  if (/AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{20,}/.test(pipeline)) {
    problems.push("jenkinsfile carries a credential-shaped string");
  }

  if (problems.length === 0) {
    console.log("pipeline: PASS (jenkins, maven gates, docker tags)");
  } else {
    for (const problem of problems) {
      console.error(`pipeline: ${problem}`);
    }
    process.exitCode = 1;
  }
}

if (values.check) {
  runCheck();
} else if (values.pipeline) {
  writeOrPrint(values.out, renderJenkinsfile(DEFAULT_CONFIG));
} else if (values.tags) {
  const branch = values.branch ?? "main";
  const build = values.build ?? "77";
  writeOrPrint(values.out, dockerTag(branch, DEFAULT_CONFIG.artifactVersion, build, values.branch?.startsWith("v") === true).join("\n") + "\n");
} else if (values.gate) {
  const coverage = Number(values.coverage ?? "81");
  const critical = Number(values.critical ?? "0");
  const result = qualityGate({ coverage, criticalIssues: critical, requiredCoverage: 80, allowedCritical: 0 });
  writeOrPrint(values.out, `level: ${result.level}\n${result.reasons.join("\n")}\n`);
} else if (values.notes) {
  writeOrPrint(values.out, renderPipelineNotes(DEFAULT_CONFIG));
} else {
  runCheck();
}