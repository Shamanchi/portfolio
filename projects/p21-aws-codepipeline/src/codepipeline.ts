import type { CodePipelineConfig } from "./model.ts";

function props(indent: string, lines: string[]): string {
  return lines.map((l) => indent + l).join("\n") + "\n";
}

export function renderSourceStage(config: CodePipelineConfig): string {
  return `    - name: Source
      actions:
        - name: FetchRepo
          actionTypeId:
            category: Source
            owner: ${config.repoProvider === "CodeCommit" ? "AWS" : "ThirdParty"}
            provider: ${config.repoProvider}
            version: "1"
          configuration:
            Owner: ${config.repoOwner}
            Repo: ${config.repoName}
            Branch: ${config.branch}
            PollForSourceChanges: true
          outputArtifacts:
            - name: SourceArtifact
`;
}

export function renderBuildStage(config: CodePipelineConfig): string {
  return `    - name: Build
      actions:
        - name: RunCodeBuild
          actionTypeId:
            category: Build
            owner: AWS
            provider: CodeBuild
            version: "1"
          configuration:
            ProjectName: ${config.buildProject}
            EnvironmentVariables:
              - name: BUCKET
                value: ${config.artifactBucket}
          inputArtifacts:
            - name: SourceArtifact
          outputArtifacts:
            - name: BuildArtifact
`;
}

export function renderStagingStage(config: CodePipelineConfig): string {
  return `    - name: Staging
      actions:
        - name: DeployToStaging
          actionTypeId:
            category: Deploy
            owner: AWS
            provider: CodeDeploy
            version: "1"
          configuration:
            ApplicationName: shop-staging
            DeploymentGroupName: staging-fleet
          inputArtifacts:
            - name: BuildArtifact
`;
}

export function renderApprovalStage(config: CodePipelineConfig): string {
  return `    - name: ${config.approvalStage}
      actions:
        - name: AskProdOwner
          actionTypeId:
            category: Approval
            owner: AWS
            provider: Manual
            version: "1"
          configuration:
            # SNS topic that pings the prod approver.
            NotificationArn: arn:aws:sns:${config.region}:000000000000:shop-approvals
            CustomData: "promote staging to prod"
            CustomData: "promote Staging -> prod"
          runOrder: 1
`;
}

export function renderDeployStage(config: CodePipelineConfig): string {
  return `    - name: Deploy
      actions:
        - name: DeployToEcs
          actionTypeId:
            category: Deploy
            owner: AWS
            provider: ECS
            version: "1"
          configuration:
            ClusterName: shop-cluster
            ServiceName: shop-service
            FileName: imagedefinitions.json
          inputArtifacts:
            - name: BuildArtifact
`;
}

export function renderPipeline(config: CodePipelineConfig): string {
  return `Resources:
  ShopDeliveryPipeline:
    Type: AWS::CodePipeline::Pipeline
    Properties:
      RoleArn: arn:aws:iam::000000000000:role/service-role/AWSCodePipelineServiceRole-shop
      ArtifactStore:
        Type: S3
        Location: ${config.artifactBucket}
      Stages:
${renderSourceStage(config)}
${renderBuildStage(config)}
${renderStagingStage(config)}
${renderApprovalStage(config)}
${renderDeployStage(config)}
`;
}

export function renderBuildSpec(config: CodePipelineConfig): string {
  if (!config) return "";
  return `version: 0.2
phases:
  install:
    nodejs: 22
    commands:
      - npm ci
  build:
    commands:
      - npm test
      - npm run typecheck
artifacts:
  files:
    - "buildspec.yml"
    - "**/*"
  discard-paths: no
`;
}

export function renderCheatSheet(config: CodePipelineConfig): string {
  return `# CodePipeline cheat sheet (${config.pipelineName})

1. Order is fixed: Source -> Build -> Staging -> ${config.approvalStage} -> Deploy.
2. The manual approval (${config.approvalStage}) is the only gate between
   staging and prod; nothing reaches prod without it.
3. Artifacts travel via S3 bucket ${config.artifactBucket}.
4. The build project is ${config.buildProject} in region ${config.region}.
`;
}