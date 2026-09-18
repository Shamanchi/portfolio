import { contains, isValidCidr, overlaps, parseCidr } from "./cidr.ts";

export interface TwoTierModel {
  region: string;
  az: string;
  vpcCidr: string;
  webCidr: string;
  dbCidr: string;
  webCount: number;
  webInstanceType: string;
  dbEngine: string;
  dbVersion: string;
  dbInstanceClass: string;
  dbStorageGb: number;
  dbPort: number;
}

export function validateModel(model: TwoTierModel): string[] {
  const problems: string[] = [];

  if (model.region.trim() === "") problems.push("region is required");
  if (model.az.trim() === "") problems.push("availability zone is required");

  for (const [label, cidr] of [
    ["vpcCidr", model.vpcCidr],
    ["webCidr", model.webCidr],
    ["dbCidr", model.dbCidr],
  ] as const) {
    if (!isValidCidr(cidr)) {
      problems.push(`${label} "${cidr}" is not a valid IPv4 CIDR`);
    }
  }

  if (problems.some((p) => p.startsWith("vpcCidr")) === false) {
    const vpc = parseCidr(model.vpcCidr);
    const web = parseCidr(model.webCidr);
    const db = parseCidr(model.dbCidr);
    if (vpc && web && !contains(vpc, web)) {
      problems.push(`webCidr ${model.webCidr} is outside vpcCidr ${model.vpcCidr}`);
    }
    if (vpc && db && !contains(vpc, db)) {
      problems.push(`dbCidr ${model.dbCidr} is outside vpcCidr ${model.vpcCidr}`);
    }
    if (web && db && overlaps(web, db)) {
      problems.push(`webCidr ${model.webCidr} overlaps dbCidr ${model.dbCidr}`);
    }
  }

  if (!Number.isInteger(model.webCount) || model.webCount < 1 || model.webCount > 10) {
    problems.push("webCount must be an integer between 1 and 10");
  }
  if (!Number.isInteger(model.dbPort) || model.dbPort < 1024 || model.dbPort > 65535) {
    problems.push("dbPort must be between 1024 and 65535");
  }
  if (!Number.isInteger(model.dbStorageGb) || model.dbStorageGb < 20 || model.dbStorageGb > 65536) {
    problems.push("dbStorageGb must be between 20 and 65536");
  }
  if (model.dbEngine.trim() === "") problems.push("dbEngine is required");

  return problems;
}

export function defaultModel(): TwoTierModel {
  return {
    region: "eu-west-1",
    az: "eu-west-1a",
    vpcCidr: "10.0.0.0/16",
    webCidr: "10.0.1.0/24",
    dbCidr: "10.0.2.0/24",
    webCount: 2,
    webInstanceType: "t3.micro",
    dbEngine: "postgres",
    dbVersion: "16.3",
    dbInstanceClass: "db.t3.micro",
    dbStorageGb: 20,
    dbPort: 5432,
  };
}