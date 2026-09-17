import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { defaultApp, validate, isFargateCpuMemory } from "../src/model.ts";
import { buildTaskDefinition, logGroupName, secretName } from "../src/taskdef.ts";
import { renderTerraform } from "../src/terraform.ts";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

test("secretName returns the last segment", () => {
  assert.equal(secretName("/django/app/DJANGO_SECRET_KEY"), "DJANGO_SECRET_KEY");
});

test("isFargateCpuMemory rejects invalid pair", () => {
  assert.equal(isFargateCpuMemory(512, 4096), true);
  assert.equal(isFargateCpuMemory(512, 8192), false);
});

test("validate accepts a fresh defaultApp", () => {
  assert.deepEqual(validate(defaultApp()), []);
});

test("validate rejects a secret duplicate in environment", () => {
  const app = defaultApp();
  app.container.environment["DB_PASSWORD"] = "plain-text";
  assert.ok(validate(app).some((p) => p.includes("DB_PASSWORD")));
});

test("buildTaskDefinition uses FARGATE", () => {
  const task = buildTaskDefinition(defaultApp());
  assert.deepEqual(task.requiresCompatibilities, ["FARGATE"]);
  assert.equal(task.networkMode, "awsvpc");
});

test("logGroupName is deterministic", () => {
  assert.equal(logGroupName({ appName: "demo" } as never), "/ecs/demo");
});

test("renderTerraform emits the ECS cluster resource", () => {
  const output = renderTerraform(defaultApp());
  assert.match(output, /resource "aws_ecs_cluster" "app"/);
  assert.match(output, /resource "aws_ecs_service" "app"/);
});

test("check CLI reports PASS for defaultApp", () => {
  const stdout = execFileSync(process.execPath, [join(projectRoot, "src", "cli.ts"), "--check"], {
    encoding: "utf8",
  });
  assert.match(stdout, /model: PASS/);
});