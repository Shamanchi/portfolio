import { allocateSubnets, formatCidr, parseCidr, type SubnetAllocation } from "./cidr.ts";

export type TierKey = "web" | "app" | "db";

export interface TierSpec {
  key: TierKey;
  subnetPrefix: number;
  count: number;
  instanceType: string;
}

export interface ThreeTierConfig {
  name: string;
  region: string;
  vpcCidr: string;
  web: TierSpec;
  app: TierSpec;
  db: TierSpec;
}

export interface Subnet {
  tier: TierKey;
  index: number;
  availabilityZone: string;
  cidr: string;
}

export interface SecurityGroupRef {
  name: string;
  description: string;
}

export interface IngressRule {
  fromPort: number;
  toPort: number;
  protocol: string;
  sourceCidr?: string;
  sourceGroup?: TierKey;
}

export interface Architecture {
  name: string;
  region: string;
  vpcCidr: string;
  subnets: Subnet[];
  securityGroups: Record<TierKey, SecurityGroupRef>;
  ingressRules: Record<TierKey, IngressRule[]>;
}

const AZ_SUFFIXES = ["a", "b", "c"] as const;

export function buildThreeTier(config: ThreeTierConfig): Architecture {
  if (!config.name.trim()) {
    throw new Error("architecture name must not be empty");
  }
  if (!/^[a-z]{2}(-[a-z]+)+-\d+$/.test(config.region)) {
    throw new Error(`region looks invalid: ${config.region}`);
  }

  const base = parseCidr(config.vpcCidr);
  const tiers: TierSpec[] = [config.web, config.app, config.db];

  for (const tier of tiers) {
    if (tier.count < 1) {
      throw new Error(`tier ${tier.key} must have at least one instance`);
    }
    if (!tier.instanceType.trim()) {
      throw new Error(`tier ${tier.key} must define an instance type`);
    }
    if (tier.subnetPrefix <= base.prefix) {
      throw new Error(`subnet prefix of tier ${tier.key} must be larger than the VPC prefix`);
    }
  }

  const webCount = config.web.count;
  const appCount = config.app.count;

  const allocations: SubnetAllocation[] = allocateSubnets(config.vpcCidr, [
    ...range(webCount, (i) => ({ name: `web-${i}`, prefix: config.web.subnetPrefix })),
    ...range(appCount, (i) => ({ name: `app-${i}`, prefix: config.app.subnetPrefix })),
    ...range(config.db.count, (i) => ({ name: `db-${i}`, prefix: config.db.subnetPrefix })),
  ]);

  const tierOf = (name: string): TierKey => (name.startsWith("web") ? "web" : name.startsWith("app") ? "app" : "db");

  const subnets: Subnet[] = allocations.map((allocation, index) => ({
    tier: tierOf(allocation.name),
    index,
    availabilityZone: `${config.region}${AZ_SUFFIXES[index % AZ_SUFFIXES.length]}`,
    cidr: formatCidr(allocation.first, allocation.prefix),
  }));

  return {
    name: config.name,
    region: config.region,
    vpcCidr: config.vpcCidr,
    subnets,
    securityGroups: {
      web: { name: `${config.name}-web-sg`, description: "Web tier: serves HTTP and HTTPS from the public internet" },
      app: { name: `${config.name}-app-sg`, description: "App tier: receives traffic only from the web tier" },
      db: { name: `${config.name}-db-sg`, description: "DB tier: receives traffic only from the app tier" },
    },
    ingressRules: {
      web: [
        { fromPort: 80, toPort: 80, protocol: "tcp", sourceCidr: "0.0.0.0/0" },
        { fromPort: 443, toPort: 443, protocol: "tcp", sourceCidr: "0.0.0.0/0" },
      ],
      app: [{ fromPort: 8080, toPort: 8080, protocol: "tcp", sourceGroup: "web" }],
      db: [{ fromPort: 5432, toPort: 5432, protocol: "tcp", sourceGroup: "app" }],
    },
  };
}

function range(count: number, mapper: (index: number) => { name: string; prefix: number }) {
  return Array.from({ length: count }, (_, index) => mapper(index));
}