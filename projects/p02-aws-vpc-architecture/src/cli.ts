import { parseArgs } from "node:util";
import { buildTopology, type AzLetter } from "./topology.ts";
import { renderTerraform } from "./hcl.ts";

function parseAzs(value: string): AzLetter[] {
  const letters = new Set<AzLetter>(value.split(",").map((part) => part.trim().toLowerCase()) as AzLetter[]);
  return (["a", "b", "c"] as AzLetter[]).filter((az) => letters.has(az));
}

const { values } = parseArgs({
  options: {
    name: { type: "string", short: "n", default: "demo-vpc" },
    region: { type: "string", short: "r", default: "eu-west-1" },
    cidr: { type: "string", short: "c", default: "10.0.0.0/16" },
    azs: { type: "string", short: "a", default: "a,b,c" },
  },
});

const topology = buildTopology({
  name: values.name ?? "demo-vpc",
  region: values.region ?? "eu-west-1",
  cidr: values.cidr ?? "10.0.0.0/16",
  azs: parseAzs(values.azs ?? "a,b,c"),
  webPrefix: 24,
  appPrefix: 24,
  dbPrefix: 26,
});

process.stdout.write(renderTerraform(topology));