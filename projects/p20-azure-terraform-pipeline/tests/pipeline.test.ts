import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { DEFAULT_CONFIG } from "../src/model.ts";
import { renderCheatSheet, renderMainTf, renderPipeline } from "../src/azurerm.ts";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

test("main.tf covers the azurerm state backend", () => {
  const tf = renderMainTf(DEFAULT_CONFIG);
  assert.match(tf, /provider "azurerm"/);
  assert.match(tf, /backend "azurerm"/);
  assert.match(tf, /resource "azurerm_storage_account" "state"/);
  assert.match(tf, /resource "azurerm_storage_container" "state"/);
  assert.equal(renderMainTf(DEFAULT_CONFIG), tf);
});

test("the pipeline plans then applies behind an approval environment", () => {
  const pipeline = renderPipeline(DEFAULT_CONFIG);
  assert.match(pipeline, /terraform init/);
  assert.match(pipeline, /terraform plan -out=tfplan/);
  assert.match(pipeline, /terraform apply -auto-approve tfplan/);
  assert.match(pipeline, /environment: dev-approval/);
});

test("the cheat sheet documents the gate", () => {
  const sheet = renderCheatSheet(DEFAULT_CONFIG);
  assert.match(sheet, /destroys are refused/);
  assert.match(sheet, /stgwacjetf\/tfstate/);
});

test("check CLI reports terraform-azure PASS", () => {
  const stdout = execFileSync(process.execPath, [join(projectRoot, "src", "cli.ts"), "--check"], {
    encoding: "utf8",
  });
  assert.match(stdout, /terraform-azure: PASS/);
});