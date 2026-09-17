export interface NodePool {
  name: string;
  vmSize: string;
  minCount: number;
  maxCount: number;
}

export interface AksModel {
  clusterName: string;
  location: string;
  resourceGroup: string;
  kubernetesVersion: string;
  networkPlugin: "azure" | "kubenet";
  nodePool: NodePool;
  dnsPrefix: string;
  mainBranch: string;
}

export function defaultAks(): AksModel {
  return {
    clusterName: "aks-portfolio",
    location: "westeurope",
    resourceGroup: "rg-portfolio-aks",
    kubernetesVersion: "1.31",
    networkPlugin: "azure",
    nodePool: {
      name: "system",
      vmSize: "Standard_D2s_v3",
      minCount: 2,
      maxCount: 4,
    },
    dnsPrefix: "aks-portfolio-dns",
    mainBranch: "main",
  };
}

export function validate(model: AksModel): string[] {
  const problems: string[] = [];
  if (!model.clusterName.match(/^[a-z0-9]([a-z0-9-]{1,49}[a-z0-9])?$/i)) {
    problems.push("clusterName must be 2-50 lowercase alphanumeric or dash");
  }
  if (!model.resourceGroup) {
    problems.push("resourceGroup must not be empty");
  }
  if (!model.kubernetesVersion.match(/^\d+\.\d+$/)) {
    problems.push("kubernetesVersion must look like 1.31");
  }
  if (model.networkPlugin !== "azure" && model.networkPlugin !== "kubenet") {
    problems.push("networkPlugin must be azure or kubenet");
  }
  if (!model.nodePool.name.trim()) {
    problems.push("nodePool.name must not be empty");
  }
  if (model.nodePool.minCount < 1 || model.nodePool.maxCount < model.nodePool.minCount) {
    problems.push("nodePool range is invalid");
  }
  return problems;
}