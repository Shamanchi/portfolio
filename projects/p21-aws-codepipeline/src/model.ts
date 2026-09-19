export const PROVIDERS = new Set(["GitHub", "CodeCommit", "S3"]);
export const COMPUTE = new Set([
  "BUILD_GENERAL1_SMALL",
  "BUILD_GENERAL1_MEDIUM",
  "BUILD_GENERAL1_LARGE",
]);
export const ENVIRONMENTS = new Set(["dev", "staging", "prod"]);

export interface CodePipelineConfig {
  pipelineName: string;
  region: string;
  repoProvider: string;
  repoOwner: string;
  repoName: string;
  branch: string;
  artifactBucket: string;
  buildProject: string;
  computeType: string;
  approvalStage: string;
  buildImage: string;
  environment: string;
}

export const DEFAULT_CONFIG: CodePipelineConfig = {
  pipelineName: "shop-delivery",
  region: "eu-central-1",
  repoProvider: "GitHub",
  repoOwner: "Shamanchi",
  repoName: "order-service",
  branch: "main",
  artifactBucket: "codepipeline-eu-central-1-shop",
  buildProject: "shop-build",
  computeType: "BUILD_GENERAL1_MEDIUM",
  approvalStage: "ProdApproval",
  buildImage: "aws/codebuild/standard:7.0",
  environment: "dev",
};

export function validateConfig(config: CodePipelineConfig): string[] {
  const problems: string[] = [];
  if (!/^[a-zA-Z0-9_\-]{1,100}$/.test(config.pipelineName)) problems.push("pipelineName is invalid");
  if (!/^[a-z]{2,3}(-[a-z0-9]+){2,}$/.test(config.region)) problems.push("region is invalid");
  if (!PROVIDERS.has(config.repoProvider)) problems.push(`repoProvider must be ${[...PROVIDERS].join("|")}`);
  if (!/^[a-zA-Z0-9\-_]+$/.test(config.repoOwner)) problems.push("repoOwner is invalid");
  if (!/^[a-zA-Z0-9\-_]+$/.test(config.repoName)) problems.push("repoName is invalid");
  if (!/^[a-zA-Z0-9\-_/]+$/.test(config.branch)) problems.push("branch is invalid");
  if (!/^[a-z0-9][a-z0-9\-]{2,62}$/.test(config.artifactBucket)) problems.push("artifactBucket is invalid");
  if (!/^[a-zA-Z0-9_\-]{1,100}$/.test(config.buildProject)) problems.push("buildProject is invalid");
  if (!COMPUTE.has(config.computeType)) {
    problems.push(`computeType must be ${[...COMPUTE].join("|")}`);
  }
  if (!/^[a-zA-Z0-9_\-]{1,100}$/.test(config.approvalStage)) problems.push("approvalStage is invalid");
  if (!/^[a-zA-Z0-9\-_:/.]+$/.test(config.buildImage)) problems.push("buildImage is invalid");
  if (!ENVIRONMENTS.has(config.environment)) problems.push(`environment must be ${[...ENVIRONMENTS].join("|")}`);
  return problems;
}

export function stageOrder(config: CodePipelineConfig): string[] {
  return ["Source", "Build", "Staging", config.approvalStage, "Deploy"];
}

export function canStartStage(config: CodePipelineConfig, stage: string, previousResults: string[]): boolean {
  const order = stageOrder(config);
  const index = order.indexOf(stage);
  if (index <= 0) return true;
  const previous = order[index - 1]!;
  if (!previousResults.includes(previous)) return false;
  if (previous === "Staging" && !config.approvalStage) return false;
  return true;
}