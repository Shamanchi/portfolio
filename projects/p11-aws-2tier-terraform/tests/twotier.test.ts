import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { contains, isValidCidr, overlaps, parseCidr, type Cidr } from "../src/cidr.ts";
import { defaultModel, validateModel } from "../src/model.ts";
import { renderTerraform } from "../src/hcl.ts";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function cidr(value: string): Cidr {
  const parsed = parseCidr(value);
  assert.ok(parsed, `expected "${value}" to parse as a CIDR`);
  return parsed;
}

test("parseCidr accepts valid IPv4 CIDRs", () => {
  assert.ok(cidr("10.0.0.0/16"));
  assert.ok(cidr("0.0.0.0/0"));
  assert.ok(cidr("255.255.255.255/32"));
});

test("parseCidr rejects malformed input", () => {
  assert.equal(parseCidr("10.0.0.0"), null);
  assert.equal(parseCidr("10.0.0.0/33"), null);
  assert.equal(parseCidr("10.0.0.256/24"), null);
  assert.equal(parseCidr("not-a-cidr"), null);
});

test("contains checks subnets inside a parent", () => {
  assert.equal(contains(cidr("10.0.0.0/16") , cidr("10.0.1.0/24")), true);
  assert.equal(contains(cidr("10.0.0.0/16") , cidr("11.0.0.0/24")), false);
  assert.equal(contains(cidr("10.0.0.0/20") , cidr("10.0.0.0/20")), true);
});

test("overlaps detects colliding networks", () => {
  assert.equal(overlaps(cidr("10.0.1.0/24") , cidr("10.0.1.0/24")), true);
  assert.equal(overlaps(cidr("10.0.1.0/24") , cidr("10.0.2.0/24")), false);
});

test("default model is valid", () => {
  assert.deepEqual(validateModel(defaultModel()), []);
  assert.equal(isValidCidr(defaultModel().vpcCidr), true);
});

test("validateModel rejects overlapping tiers", () => {
  const model = { ...defaultModel(), webCidr: "10.0.1.0/24", dbCidr: "10.0.1.128/25" };
  const problems = validateModel(model);
  assert.equal(problems.some((p) => p.includes("overlaps")), true);
});

test("validateModel rejects a tier outside the vpc", () => {
  const model = { ...defaultModel(), dbCidr: "192.168.0.0/24" };
  const problems = validateModel(model);
  assert.equal(problems.some((p) => p.includes("outside vpcCidr")), true);
});

test("validateModel rejects an invalid port", () => {
  const model = { ...defaultModel(), dbPort: 22 };
  const problems = validateModel(model);
  assert.equal(problems.some((p) => p.includes("dbPort")), true);
});

test("validateModel rejects a non-integer web count", () => {
  const model = { ...defaultModel(), webCount: 0 };
  const problems = validateModel(model);
  assert.equal(problems.some((p) => p.includes("webCount")), true);
});

test("render is deterministic and complete", () => {
  const first = renderTerraform(defaultModel());
  const second = renderTerraform(defaultModel());
  assert.equal(first, second);
  assert.match(first, /resource "aws_vpc" "main"/);
  assert.match(first, /resource "aws_instance" "web"/);
  assert.match(first, /resource "aws_db_instance" "main"/);
  assert.match(first, /aws_security_group.web.id/);
  assert.doesNotMatch(first, /(?:password|token)\s*=\s*"[^"]{8,}"/);
  assert.doesNotMatch(first, /\$\{/);
});

test("check CLI reports PASS", () => {
  const stdout = execFileSync(process.execPath, [join(projectRoot, "src", "cli.ts"), "--check"], {
    encoding: "utf8",
  });
  assert.match(stdout, /check: PASS/);
});

test("check CLI fails for an invalid port", () => {
  assert.throws(
    () =>
      execFileSync(process.execPath, [join(projectRoot, "src", "cli.ts"), "--db-port", "22"], {
        encoding: "utf8",
      }),
    /dbPort/,
  );
});