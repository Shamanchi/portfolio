export interface AksPipelineConfig {
  serviceName: string;
  resourceGroup: string;
  clusterName: string;
  acrName: string;
  location: string;
  namespace: string;
  helmRelease: string;
  acrServiceConnection: string;
  kubeServiceConnection: string;
  requiredNodes: number;
}

export const DEFAULT_CONFIG: AksPipelineConfig = {
  serviceName: "shop-api",
  resourceGroup: "rg-shop-aks",
  clusterName: "aks-shop",
  acrName: "shopacr",
  location: "westeurope",
  namespace: "shop",
  helmRelease: "shop",
  acrServiceConnection: "acr-push",
  kubeServiceConnection: "aks-shop",
  requiredNodes: 3,
};

const DNS_LABEL = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;

export function validateConfig(config: AksPipelineConfig): string[] {
  const problems: string[] = [];
  if (!DNS_LABEL.test(config.serviceName)) problems.push("serviceName must be a DNS-1123 label");
  if (!DNS_LABEL.test(config.clusterName)) problems.push("clusterName must be a DNS-1123 label");
  if (!DNS_LABEL.test(config.namespace)) problems.push("namespace must be a DNS-1123 label");
  if (!/^[a-z0-9]{5,50}$/.test(config.acrName)) {
    problems.push("acrName must be 5..50 lowercase alphanumerics (registry names are globally unique)");
  }
  if (!/^[a-z][a-z0-9-]*$/.test(config.location)) problems.push("location looks invalid");
  if (!/^[a-z0-9-]+$/.test(config.resourceGroup)) problems.push("resourceGroup looks invalid");
  if (config.acrServiceConnection.trim() === "") problems.push("acrServiceConnection is required");
  if (config.kubeServiceConnection.trim() === "") problems.push("kubeServiceConnection is required");
  if (config.requiredNodes < 1 || config.requiredNodes > 20) problems.push(`requiredNodes must be 1..20`);
  return problems;
}