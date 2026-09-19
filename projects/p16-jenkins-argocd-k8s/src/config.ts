export interface ArgoConfig {
  appName: string;
  project: string;
  sourceRepo: string;
  sourcePath: string;
  targetRevision: string;
  destinationNamespace: string;
  destinationServer: string;
  autoPrune: boolean;
  selfHeal: boolean;
}

export interface JenkinsConfig {
  jobName: string;
  branch: string;
  imageRepo: string;
  registryCredentialId: string;
  cron: string;
}

export const DEFAULT_ARGO: ArgoConfig = {
  appName: "shop-api",
  project: "default",
  sourceRepo: "https://github.com/Shamanchi/shop-gitops",
  sourcePath: "environments/prod",
  targetRevision: "main",
  destinationNamespace: "prod",
  destinationServer: "https://kubernetes.default.svc",
  autoPrune: true,
  selfHeal: true,
};

export const DEFAULT_JENKINS: JenkinsConfig = {
  jobName: "shop-api-build",
  branch: "main",
  imageRepo: "ghcr.io/shamanchi/shop-api",
  registryCredentialId: "ghcr-push",
  cron: "H H * * *",
};

const DNS_LABEL = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;

export function validateConfig(argocd: ArgoConfig, jenkins: JenkinsConfig): string[] {
  const problems: string[] = [];
  if (!DNS_LABEL.test(argocd.appName)) problems.push("argocd.appName must be a DNS-1123 label");
  if (!DNS_LABEL.test(argocd.destinationNamespace)) problems.push("destinationNamespace must be a DNS-1123 label");
  if (!/^(git@|https:\/\/)/.test(argocd.sourceRepo)) {
    problems.push("sourceRepo must start with git@ or https://");
  }
  if (argocd.sourcePath.trim() === "") problems.push("sourcePath is required");
  if (!argocd.autoPrune && !argocd.selfHeal) problems.push("at least one sync automation should be enabled");
  if (!/^[a-z0-9]+([.\-/][a-z0-9]+)*$/.test(jenkins.imageRepo)) problems.push("imageRepo looks invalid");
  if (jenkins.registryCredentialId.trim() === "") problems.push("registryCredentialId is required");
  if (!/^[A-Za-z0-9*,\- ]+$/.test(jenkins.cron)) problems.push("cron looks invalid");
  return problems;
}