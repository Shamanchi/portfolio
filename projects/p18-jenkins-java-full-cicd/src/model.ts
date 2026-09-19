export interface JavaPipelineConfig {
  appName: string;
  mavenVersion: string;
  jdkVersion: string;
  artifactVersion: string;
  registryHost: string;
  sonarQubeUrl: string;
  repoUrl: string;
  branchDelivery: string;
}

export const DEFAULT_CONFIG: JavaPipelineConfig = {
  appName: "order-service",
  mavenVersion: "3.9.9",
  jdkVersion: "17",
  artifactVersion: "1.4.2",
  registryHost: "harbor.shamanchi.dev",
  sonarQubeUrl: "https://sonar.example.internal",
  repoUrl: "https://github.com/Shamanchi/order-service",
  branchDelivery: "main",
};

export function validateConfig(config: JavaPipelineConfig): string[] {
  const problems: string[] = [];
  if (!/^[a-z0-9]+([-][a-z0-9]+)*$/.test(config.appName)) problems.push("appName must be lowercase with dashes");
  if (!/^3\.\d+\.\d+$/.test(config.mavenVersion)) problems.push("mavenVersion must be 3.x.y");
  if (!/^(8|11|17|21)$/.test(config.jdkVersion)) problems.push("jdkVersion must be a supported LTS");
  if (!/^\d+\.\d+\.\d+$/.test(config.artifactVersion)) problems.push("artifactVersion must be semver");
  if (!/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/.test(config.registryHost)) problems.push("registryHost looks invalid");
  if (!config.sonarQubeUrl.startsWith("https://")) problems.push("sonarQubeUrl must be https");
  if (!config.repoUrl.startsWith("https://")) problems.push("repoUrl must be https");
  if (config.branchDelivery.trim() === "") problems.push("branchDelivery is required");
  return problems;
}