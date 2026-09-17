import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { allocateBlocks, formatCidr, intToIp, ipToInt, parseCidr } from "../src/ip.ts";
import { buildTopology, type AzLetter, type VpcConfig } from "../src/topology.ts";
import { renderTerraform } from "../src/hcl.ts";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function defaultConfig(): VpcConfig {
  return {
    name: "demo-vpc",
    region: "eu-west-1",
    cidr: "10.0.0.0/16",
    azs: ["a", "b", "c"],
    webPrefix: 24,
    appPrefix: 24,
    dbPrefix: 26,
  };
}

test("ipToInt and intToIp roundtrip", () => {
  assert.equal(intToIp(ipToInt("10.0.0.0")), "10.0.0.0");
  assert.equal(intToIp(ipToInt("255.255.255.255") >>> 0), "255.255.255.255");
});

test("parseCidr normalizes a host to its network edge", () => {
  const block = parseCidr("10.0.1.77/24");
  assert.equal(block.first, ipToInt("10.0.1.0"));
  assert.equal(block.size, 256);
});

test("allocateBlocks lays out blocks sequentially", () => {
  const blocks = allocateBlocks("10.0.0.0/16", [
    { name: "a", prefix: 24 },
    { name: "b", prefix: 24 },
  ]);
  assert.equal(formatCidr(blocks[0]!.first, blocks[0]!.prefix), "10.0.0.0/24");
  assert.equal(formatCidr(blocks[1]!.first, blocks[1]!.prefix), "10.0.1.0/24");
});

test("allocateBlocks throws when space runs out", () => {
  assert.throws(
    () =>
      allocateBlocks("10.0.0.0/26", [
        { name: "a", prefix: 26 },
        { name: "b", prefix: 26 },
      ]),
    /no room/,
  );
});

test("buildTopology places every tier in every availability zone", () => {
  const topology = buildTopology(defaultConfig());
  assert.equal(topology.subnets.filter((s) => s.tier === "web").length, 3);
  assert.equal(topology.subnets.filter((s) => s.tier === "app").length, 3);
  assert.equal(topology.subnets.filter((s) => s.tier === "db").length, 3);

  for (const az of ["a", "b", "c"] as AzLetter[]) {
    assert.ok(topology.subnets.some((s) => s.tier === "web" && s.az === az));
    assert.ok(topology.subnets.some((s) => s.tier === "db" && s.az === az));
  }
});

test("buildTopology produces non-overlapping CIDRs", () => {
  const topology = buildTopology(defaultConfig());
  const cidrs = topology.subnets.map((s) => s.cidr);
  assert.equal(new Set(cidrs).size, cidrs.length);
});

test("buildTopology rejects a VPC that is too small", () => {
  const config = defaultConfig();
  config.cidr = "10.0.0.0/22";
  assert.throws(() => buildTopology(config), /no room/);
});

test("buildTopology rejects unknown availability zones", () => {
  const config = defaultConfig();
  config.azs = ["a", "z"] as AzLetter[];
  assert.throws(() => buildTopology(config), /unsupported availability zone/);
});

test("buildTopology rejects a region that does not look like a region", () => {
  const config = defaultConfig();
  config.region = "earth";
  assert.throws(() => buildTopology(config), /region looks invalid/);
});

test("renderTerraform emits NAT per AZ and routes private tiers through it", () => {
  const topology = buildTopology(defaultConfig());
  const output = renderTerraform(topology);

  for (const az of ["a", "b", "c"]) {
    assert.ok(output.includes(`resource "aws_nat_gateway" "nat_${az}"`), `NAT for ${az}`);
    assert.ok(output.includes(`resource "aws_route_table" "private_${az}"`), `private RT for ${az}`);
    assert.ok(output.includes(`nat_gateway_id = aws_nat_gateway.nat_${az}.id`), `route to NAT for ${az}`);
  }

  assert.ok(output.includes('resource "aws_subnet" "web_a"'));
  assert.ok(output.includes('resource "aws_subnet" "db_c"'));
  assert.ok(!/\bundefined\b/.test(output), "rendered HCL must not contain undefined");
});

test("renderTerraform attaches web subnets to public route tables", () => {
  const topology = buildTopology(defaultConfig());
  const output = renderTerraform(topology);
  assert.ok(output.includes("route_table_id = aws_route_table.public_a.id"));
  assert.ok(output.includes('output "web_subnets"'));
});

test("CLI renders the default VPC topology", () => {
  const stdout = execFileSync(process.execPath, [join(projectRoot, "src", "cli.ts")], {
    encoding: "utf8",
  });
  assert.ok(stdout.includes('resource "aws_vpc" "main"'));
  assert.ok(stdout.includes('cidr_block           = "10.0.0.0/16"'));
  assert.equal((stdout.match(/resource "aws_subnet"/g) ?? []).length, 9);
});