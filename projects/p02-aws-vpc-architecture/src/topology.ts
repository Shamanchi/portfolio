import { allocateBlocks, formatCidr, parseCidr } from "./ip.ts";

export type AzLetter = "a" | "b" | "c";
export type TierKey = "web" | "app" | "db";

export interface VpcConfig {
  name: string;
  region: string;
  cidr: string;
  azs: AzLetter[];
  webPrefix: number;
  appPrefix: number;
  dbPrefix: number;
}

export interface PlannedSubnet {
  az: AzLetter;
  tier: TierKey;
  index: number;
  cidr: string;
}

export interface RouteTablePlan {
  public: Array<{ az: AzLetter }>;
  private: Array<{ az: AzLetter }>;
}

export interface Topology {
  name: string;
  region: string;
  cidr: string;
  subnets: PlannedSubnet[];
  routeTables: RouteTablePlan;
}

const VALID_AZ: AzLetter[] = ["a", "b", "c"];

export function buildTopology(config: VpcConfig): Topology {
  if (!config.name.trim()) {
    throw new Error("VPC name must not be empty");
  }
  if (!/^[a-z]{2}(-[a-z]+)+-\d+$/.test(config.region)) {
    throw new Error(`region looks invalid: ${config.region}`);
  }
  if (config.azs.length === 0) {
    throw new Error("at least one availability zone is required");
  }
  const seen = new Set<string>();
  for (const az of config.azs) {
    if (!VALID_AZ.includes(az)) {
      throw new Error(`unsupported availability zone suffix: ${az}`);
    }
    if (seen.has(az)) {
      throw new Error(`duplicate availability zone: ${az}`);
    }
    seen.add(az);
  }

  const base = parseCidr(config.cidr);
  const tiers: Array<{ key: TierKey; prefix: number }> = [
    { key: "web", prefix: config.webPrefix },
    { key: "app", prefix: config.appPrefix },
    { key: "db", prefix: config.dbPrefix },
  ];

  const blocks: Array<{ name: string; prefix: number }> = [];
  for (const az of config.azs) {
    for (const tier of tiers) {
      if (tier.prefix <= base.prefix) {
        throw new Error(`prefix of tier ${tier.key} must be larger than the VPC prefix`);
      }
      blocks.push({ name: `${tier.key}-${az}`, prefix: tier.prefix });
    }
  }

  const allocated = allocateBlocks(config.cidr, blocks);

  const subnets: PlannedSubnet[] = [];
  for (const block of allocated) {
    const [tier, az] = block.name.split("-") as [TierKey, AzLetter];
    subnets.push({
      tier,
      az,
      index: subnets.filter((s) => s.tier === tier && s.az === az).length,
      cidr: formatCidr(block.first, block.prefix),
    });
  }

  return {
    name: config.name,
    region: config.region,
    cidr: config.cidr,
    subnets,
    routeTables: {
      public: config.azs.map((az) => ({ az })),
      private: config.azs.map((az) => ({ az })),
    },
  };
}