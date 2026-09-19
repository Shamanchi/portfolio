import { test } from "node:test";
import assert from "node:assert/strict";
import { describe } from "node:test";
import {
  validateConfig,
  DEFAULT_CONFIG,
  canStartStage,
  stageOrder,
  PROVIDERS,
  COMPUTE,
  ENVIRONMENTS,
} from "../src/model.ts";
import {
  renderPipeline,
  renderBuildSpec,
  renderApprovalStage,
  renderCheatSheet,
} from "../src/codepipeline.ts";

describe("model validation", () => {
  test("defaults are valid", () => {
    assert.deepEqual(validateConfig(DEFAULT_CONFIG), []);
  });

  test("rejects bad provider", () => {
    assert.ok(validateConfig({ ...DEFAULT_CONFIG, repoProvider: "GitLab" }).length > 0);
  });

  test("rejects missing pipeline name", () => {
    assert.ok(validateConfig({ ...DEFAULT_CONFIG, pipelineName: "" }).length > 0);
  });
});

describe("stage order and gates", () => {
  test("fixed order", () => {
    assert.deepEqual(stageOrder(DEFAULT_CONFIG), ["Source", "Build", "Staging", "ProdApproval", "Deploy"]);
  });

  test("deploy requires approval gate", () => {
    assert.equal(canStartStage(DEFAULT_CONFIG, "Deploy", ["Staging", "Build", "Source"]), false);
    assert.equal(
      canStartStage(DEFAULT_CONFIG, "Deploy", ["Staging", "Build", "Source", "ProdApproval"]),
      true
    );
  });
});

describe("rendering", () => {
  test("pipeline has all stages", () => {
    const pipeline = renderPipeline(DEFAULT_CONFIG);
    for (const fragment of ["Source", "Build", "Staging", "ProdApproval", "Deploy", "AWS::CodePipeline::Pipeline"]) {
      assert.ok(pipeline.includes(fragment));
    }
  });

  test("buildspec renders npm ci", () => {
    assert.ok(renderBuildSpec(DEFAULT_CONFIG).includes("npm ci"));
  });

  test("approval stage references SNS", () => {
    assert.ok(renderApprovalStage(DEFAULT_CONFIG).includes("arn:aws:sns"));
  });

  test("cheat sheet mentions the manual gate", () => {
    assert.ok(renderCheatSheet(DEFAULT_CONFIG).includes("only gate"));
  });
});

test("no credential-shaped strings shipped", () => {
  const texts = [
    renderPipeline(DEFAULT_CONFIG),
    renderBuildSpec(DEFAULT_CONFIG),
    renderApprovalStage(DEFAULT_CONFIG),
  ].join("\n");
  assert.doesNotMatch(texts, /AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{20,}|password\s*[:=]/);
});
