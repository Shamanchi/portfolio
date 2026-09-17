export type StageType = "quality" | "scan" | "sbom" | "build" | "promote";

export interface Environment {
  name: string;
  requiredReviewers: number;
}

export interface PipelineModel {
  workflowName: string;
  imageName: string;
  mainBranch: string;
  environments: Environment[];
  stages: StageType[];
}

export const VALID_STAGES: ReadonlyArray<StageType> = [
  "quality",
  "scan",
  "sbom",
  "build",
  "promote",
];

export function defaultPipeline(): PipelineModel {
  return {
    workflowName: "advanced-cicd",
    imageName: "ghcr.io/shamanchi/portfolio/service",
    mainBranch: "main",
    environments: [
      { name: "production", requiredReviewers: 1 },
    ],
    stages: ["quality", "scan", "sbom", "build", "promote"],
  };
}

export function validate(model: PipelineModel): string[] {
  const problems: string[] = [];
  if (!model.workflowName.match(/^[a-z0-9-]+$/)) {
    problems.push("workflowName must be lowercase with dashes");
  }
  if (!model.mainBranch) {
    problems.push("mainBranch must not be empty");
  }
  if (!model.imageName.match(/^[\w.\/-]+$/)) {
    problems.push("imageName contains invalid characters");
  }
  if (model.environments.length === 0) {
    problems.push("at least one release environment is required");
  }
  const envNames = model.environments.map((env) => env.name);
  if (new Set(envNames).size !== envNames.length) {
    problems.push("environment names must be unique");
  }
  for (const env of model.environments) {
    if (env.requiredReviewers < 1) {
      problems.push(`${env.name} must require at least one reviewer`);
    }
  }
  if (model.stages.length === 0) {
    problems.push("stages must not be empty");
  }
  const seen = new Set<StageType>();
  for (const stage of model.stages) {
    if (seen.has(stage)) {
      problems.push(`stage ${stage} is duplicated`);
    }
    seen.add(stage);
    if (!VALID_STAGES.includes(stage)) {
      problems.push(`unknown stage ${stage}`);
    }
  }
  return problems;
}