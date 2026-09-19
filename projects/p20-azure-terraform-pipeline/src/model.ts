export interface AzurePipelineConfig {
  workspace: string;
  location: string;
  resourceGroup: string;
  terraformVersion: string;
  environment: string;
  storageAccount: string;
  containerName: string;
}

export const DEFAULT_CONFIG: AzurePipelineConfig = {
  workspace: "acme",
  location: "westeurope",
  resourceGroup: "rg-acme-infra",
  terraformVersion: "1.9.8",
  environment: "dev",
  storageAccount: "stgwacjetf",
  containerName: "tfstate",
};

const LOCATIONS = new Set(["northeurope", "westeurope", "francecentral", "uksouth", "germanywestcentral"]);
const ENVIRONMENTS = new Set(["dev", "staging", "prod"]);

export function validateConfig(config: AzurePipelineConfig): string[] {
  const problems: string[] = [];
  if (!LOCATIONS.has(config.location)) problems.push("location must be an EU Azure region from the allow list");
  if (!/^[a-z0-9()-]{1,90}$/.test(config.resourceGroup)) problems.push("resourceGroup must be 1..90 lowercase alnum/dash");
  if (!/^\d+\.\d+\.\d+$/.test(config.terraformVersion)) problems.push("terraformVersion must be semver");
  if (!ENVIRONMENTS.has(config.environment)) problems.push("environment must be dev|staging|prod");
  if (!/^[a-z0-9]{3,24}$/.test(config.storageAccount)) problems.push("storageAccount must be 3..24 lowercase alnum");
  if (config.storageAccount.length < 3 || config.storageAccount.length > 24) problems.push("storageAccount length is out of range");
  return problems;
}

export function backendKey(workspace: string, component: string, scope: string): string {
  const slug = component.replace(/[^A-Za-z0-9]+/g, "-").toLowerCase().slice(0, 32);
  const env = workspace.toLowerCase();
  return `${env}/${slug}/${scope}.tfstate`;
}

export interface PlanReport {
  changes: number;
  adds: number;
  updates: number;
  destroys: number;
}

const PLAN_LINE = /Plan: (\d+) to add, (\d+) to change, (\d+) to destroy\./;

export function interpretPlan(output: string): PlanReport | undefined {
  const match = output.match(PLAN_LINE);
  if (!match) return undefined;
  return { changes: 0, adds: Number(match[1]), updates: Number(match[2]), destroys: Number(match[3]) };
}

export function planGate(output: string, environment: string): { apply: boolean; reason: string } {
  const report = interpretPlan(output);
  if (!report) return { apply: false, reason: "no plan summary found" };
  const { adds, updates, destroys } = report;
  if (adds + updates + destroys === 0) return { apply: false, reason: "no changes" };
  if (environment === "prod" && destroys > 0) return { apply: false, reason: `${destroys} destroys blocked in prod` };
  return { apply: true, reason: `applying ${adds} adds, ${updates} updates, ${destroys} destroys` };
}