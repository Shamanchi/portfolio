import { parseArgs } from "node:util";
import { buildThreeTier } from "./model.ts";
import { renderTerraform } from "./hcl.ts";

const { values } = parseArgs({
  options: {
    name: { type: "string", short: "n", default: "java-3tier" },
    region: { type: "string", short: "r", default: "eu-west-1" },
    vpcCidr: { type: "string", short: "c", default: "10.0.0.0/16" },
  },
});

const architecture = buildThreeTier({
  name: values.name ?? "java-3tier",
  region: values.region ?? "eu-west-1",
  vpcCidr: values.vpcCidr ?? "10.0.0.0/16",
  web: { key: "web", subnetPrefix: 24, count: 2, instanceType: "t3.micro" },
  app: { key: "app", subnetPrefix: 25, count: 2, instanceType: "t3.micro" },
  db: { key: "db", subnetPrefix: 26, count: 2, instanceType: "db.t3.micro" },
});

process.stdout.write(renderTerraform(architecture));