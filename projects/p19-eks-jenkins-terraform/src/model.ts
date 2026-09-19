export interface TfStackConfig {
  workspace: string;
  region: string;
  clusterName: string;
  clusterVersion: string;
  nodeCount: number;
  nodeMinSize: number;
  nodeMaxSize: number;
  nodeInstanceType: string;
  nodeDiskSize: number;
  jenkinsNamespace: string;
  jenkinsRelease: string;
}

export const DEFAULT_CONFIG: TfStackConfig = {
  workspace: "prod",
  region: "eu-central-1",
  clusterName: "shop-eks",
  clusterVersion: "1.32",
  nodeCount: 3,
  nodeMinSize: 3,
  nodeMaxSize: 9,
  nodeInstanceType: "m6i.large",
  nodeDiskSize: 80,
  jenkinsNamespace: "jenkins",
  jenkinsRelease: "jenkins",
};

const INSTANCE_TYPES = new Set([
  "m5.large", "m5.xlarge", "m6i.large", "m6i.xlarge",
  "c5.large", "c5.xlarge", "r5.large", "r5.xlarge",
]);

export function validateConfig(config: TfStackConfig): string[] {
  const problems: string[] = [];
  if (!/^(dev|staging|prod|shared)$/.test(config.workspace)) problems.push("workspace must be dev|staging|prod|shared");
  if (!/^[a-z]{2}(-[a-z]+)+-\d$/.test(config.region)) problems.push("region must look like eu-central-1");
  if (!/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(config.clusterName)) problems.push("clusterName must be a DNS label");
  if (!/^\d+\.\d+$/.test(config.clusterVersion)) problems.push("clusterVersion must be Kubernetes x.y");
  if (config.nodeCount < config.nodeMinSize || config.nodeCount > config.nodeMaxSize) {
    problems.push("nodeCount must sit between min and max size");
  }
  if (config.nodeMinSize < 1 || config.nodeMaxSize < config.nodeMinSize) {
    problems.push("node group sizes are inconsistent");
  }
  if (!INSTANCE_TYPES.has(config.nodeInstanceType)) {
    problems.push(`nodeInstanceType must be one of ${[...INSTANCE_TYPES].join(", ")}`);
  }
  if (config.nodeDiskSize < 40 || config.nodeDiskSize > 4096) problems.push("nodeDiskSize must be 40..4096 GiB");
  return problems;
}