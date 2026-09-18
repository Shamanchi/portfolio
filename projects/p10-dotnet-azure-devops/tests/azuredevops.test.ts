import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { defaultModel, validateModel } from "../src/model.ts";
import {
  SAMPLE_CSPROJ,
  extractPackageReferences,
  extractTargetFrameworks,
  validateCsproj,
} from "../src/xml.ts";
import { renderNotes, renderPipeline } from "../src/pipeline.ts";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

test("default model is valid", () => {
  assert.deepEqual(validateModel(defaultModel()), []);
});

test("validateModel rejects a malformed framework", () => {
  const model = { ...defaultModel(), framework: "9" };
  const problems = validateModel(model);
  assert.equal(problems.some((p) => p.includes("framework")), true);
});

test("validateModel rejects duplicate environments", () => {
  const model = { ...defaultModel(), environments: ["prod", "prod"] };
  const problems = validateModel(model);
  assert.equal(problems.some((p) => p.includes("unique")), true);
});

test("extractTargetFrameworks finds the target framework", () => {
  assert.deepEqual(extractTargetFrameworks(SAMPLE_CSPROJ), ["net9.0"]);
});

test("extractPackageReferences collects names and versions", () => {
  const packages = extractPackageReferences(SAMPLE_CSPROJ);
  assert.equal(packages.length, 2);
  assert.equal(packages[0]?.name, "Microsoft.AspNetCore.Authentication.JwtBearer");
  assert.equal(packages[0]?.version, "9.0.0");
});

test("validateCsproj passes on the sample", () => {
  const check = validateCsproj(SAMPLE_CSPROJ, "9.0");
  assert.equal(check.ok, true);
  assert.equal(check.packageCount, 2);
});

test("validateCsproj flags a missing target framework and duplicates", () => {
  const broken = `<Project><ItemGroup>
    <PackageReference Include="A" Version="1.0.0" />
    <PackageReference Include="A" Version="1.0.0" />
  </ItemGroup></Project>`;
  const check = validateCsproj(broken, "9.0");
  assert.equal(check.ok, false);
  assert.equal(check.problems.some((p) => p.includes("TargetFramework")), true);
  assert.equal(check.problems.some((p) => p.includes("duplicate")), true);
});

test("pipeline renders build and approval-gated release stages", () => {
  const pipeline = renderPipeline(defaultModel());
  assert.match(pipeline, /stage: Build/);
  assert.match(pipeline, /deployment: Deploy/);
  assert.match(pipeline, /AzureWebApp@1/);
  assert.match(pipeline, /environment: production/);
  assert.match(pipeline, /dotnet test/);
});

test("pipeline carries no literal secrets", () => {
  const pipeline = renderPipeline(defaultModel());
  assert.doesNotMatch(pipeline, /\bghp_[A-Za-z0-9]{20,}\b/);
  assert.doesNotMatch(pipeline, /\bsk-[A-Za-z0-9]{20,}\b/);
});

test("check CLI reports PASS", () => {
  const stdout = execFileSync(process.execPath, [join(projectRoot, "src", "cli.ts"), "--check"], {
    encoding: "utf8",
  });
  assert.match(stdout, /PASS/);
});

test("notes cover the manual trigger", () => {
  const notes = renderNotes(defaultModel());
  assert.match(notes, /az pipelines run/);
  assert.match(notes, /approval/);
});