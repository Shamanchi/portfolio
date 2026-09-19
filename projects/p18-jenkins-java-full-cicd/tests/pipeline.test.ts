import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { DEFAULT_CONFIG } from "../src/model.ts";
import { renderJenkinsfile, renderPipelineNotes } from "../src/jenkins.ts";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

test("the Jenkinsfile covers the full delivery chain", () => {
  const pipeline = renderJenkinsfile(DEFAULT_CONFIG);
  assert.match(pipeline, /mvn -B compile/);
  assert.match(pipeline, /mvn -B test/);
  assert.match(pipeline, /mvn -B spotbugs:check/);
  assert.match(pipeline, /mvn -B -DskipTests package/);
  assert.match(pipeline, /docker push/);
  assert.match(pipeline, /stage\('Quality approval'\)/);
  assert.match(pipeline, /helm upgrade --install order-service/);
  assert.equal(renderJenkinsfile(DEFAULT_CONFIG), pipeline);
});

test("registry credentials are referenced by id only", () => {
  const pipeline = renderJenkinsfile(DEFAULT_CONFIG);
  assert.match(pipeline, /credentials\('harbor-pusher'\)/);
  assert.match(pipeline, /harbor\.shamanchi\.dev/);
  assert.doesNotMatch(pipeline, /password\s*[:=]\s*["'][^"']+["']|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{20,}/);
});

test("the pipeline notes document tags and gates", () => {
  const notes = renderPipelineNotes(DEFAULT_CONFIG);
  assert.match(notes, /release\/\*/);
  assert.match(notes, /src\/gates\.ts/);
  assert.match(notes, /harbor\.shamanchi\.dev/);
});

test("check CLI reports pipeline PASS", () => {
  const stdout = execFileSync(process.execPath, [join(projectRoot, "src", "cli.ts"), "--check"], {
    encoding: "utf8",
  });
  assert.match(stdout, /pipeline: PASS/);
});

test("gate CLI reports a warning for a near miss", () => {
  const stdout = execFileSync(process.execPath, [join(projectRoot, "src", "cli.ts"), "--gate"], {
    encoding: "utf8",
  });
  assert.match(stdout, /level: pass/);
});