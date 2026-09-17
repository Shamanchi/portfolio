import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { allocateSubnets, formatCidr, intToIp, ipToInt, parseCidr } from "../src/cidr.ts";
import { buildThreeTier } from "../src/model.ts";
import { renderTerraform } from "../src/hcl.ts";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function defaultConfig() {
  return {
    name: "demo",
    region: "eu-west-1",
    vpcCidr: "10.0.0.0/16",
    web: { key: "web" as const, subnetPrefix: 24, count: 2, instanceType: "t3.micro" },
    app: { key: "app" as const, subnetPrefix: 25, count: 2, instanceType: "t3.micro" },
    db: { key: "db" as const, subnetPrefix: 26, count: 2, instanceType: "db.t3.micro" },
  };
}

test("ipToInt and intToIp roundtrip", () => {
  for (const ip of ["0.0.0.0", "10.0.0.1", "172.31.255.255", "255.255.255.255"]) {
    assert.equal(intToIp(ipToInt(ip)), ip);
  }
});

test("parseCidr masks the base to the network edge", () => {
  const parsed = parseCidr("10.11.12.13/16");
  assert.equal(parsed.first, ipToInt("10.11.0.0"));
  assert.equal(parsed.prefix, 16);
  assert.equal(parsed.size, 65536);
});

test("ipToInt rejects malformed addresses", () => {
  assert.throws(() => ipToInt("10.0.0"), /invalid IPv4/);
  assert.throws(() => ipToInt("10.0.0.300"), /invalid IPv4/);
});

test("allocateSubnets splits a /16 into sequential blocks", () => {
  const result = allocateSubnets("10.0.0.0/16", [
    { name: "a", prefix: 24 },
    { name: "b", prefix: 24 },
  ]);
  assert.equal(result.length, 2);
  assert.equal(formatCidr(result[0]!.first, result[0]!.prefix), "10.0.0.0/24");
  assert.equal(formatCidr(result[1]!.first, result[1]!.prefix), "10.0.1.0/24");
});

test("allocateSubnets throws when the base block is too small", () => {
  assert.throws(
    () =>
      allocateSubnets("10.0.0.0/24", [
        { name: "a", prefix: 25 },
        { name: "b", prefix: 25 },
        { name: "c", prefix: 25 },
      ]),
    /no room/,
  );
});

test("buildThreeTier lays out web, app and db without overlap", () => {
  const arch = buildThreeTier(defaultConfig());
  assert.equal(arch.subnets.filter((s) => s.tier === "web").length, 2);
  assert.equal(arch.subnets.filter((s) => s.tier === "app").length, 2);
  assert.equal(arch.subnets.filter((s) => s.tier === "db").length, 2);

  const cidrs = arch.subnets.map((s) => s.cidr);
  assert.equal(new Set(cidrs).size, cidrs.length, "subnet CIDRs must not overlap");

  const base = parseCidr("10.0.0.0/16");
  for (const subnet of arch.subnets) {
    const parsed = parseCidr(subnet.cidr);
    assert.ok(parsed.first >= base.first && parsed.first + parsed.size <= base.first + base.size);
  }
});

test("buildThreeTier rejects an empty name", () => {
  assert.throws(() => buildThreeTier({ ...defaultConfig(), name: " " }), /name must not be empty/);
});

test("buildThreeTier rejects an invalid region", () => {
  const config = defaultConfig();
  config.region = "localhost";
  assert.throws(() => buildThreeTier(config), /region looks invalid/);
});

test("buildThreeTier rejects an empty tier", () => {
  const config = defaultConfig();
  config.web.count = 0;
  assert.throws(() => buildThreeTier(config), /at least one instance/);
});

test("buildThreeTier rejects subnets smaller than the VPC prefix", () => {
  const config = defaultConfig();
  config.app.subnetPrefix = 16;
  assert.throws(() => buildThreeTier(config), /larger than the VPC prefix/);
});

test("renderTerraform emits the core resources for three tiers", () => {
  const arch = buildThreeTier(defaultConfig());
  const output = renderTerraform(arch);

  for (const marker of [
    'resource "aws_vpc" "main"',
    'cidr_block           = "10.0.0.0/16"',
    'resource "aws_subnet" "web_0"',
    'resource "aws_security_group" "web"',
    'resource "aws_security_group" "db"',
    'resource "aws_instance" "web_0"',
    'resource "aws_instance" "app_0"',
    'resource "aws_db_instance" "main"',
  ]) {
    assert.ok(output.includes(marker), `expected output to contain: ${marker}`);
  }

  assert.ok(!output.includes("undefined"), "rendered HCL must not contain undefined");
});

test("renderTerraform wires the app tier to the web security group", () => {
  const arch = buildThreeTier(defaultConfig());
  const output = renderTerraform(arch);
  const appSegment = output.slice(output.indexOf('resource "aws_security_group" "app"'), output.indexOf('resource "aws_security_group" "db"'));
  assert.ok(appSegment.includes("aws_security_group.web.id"));
});

test("CLI renders architecture for the default profile", () => {
  const stdout = execFileSync(process.execPath, [join(projectRoot, "src", "cli.ts")], {
    encoding: "utf8",
  });
  assert.ok(stdout.includes('resource "aws_vpc"'));
  assert.ok(stdout.includes("Name = \"java-3tier\""));
});