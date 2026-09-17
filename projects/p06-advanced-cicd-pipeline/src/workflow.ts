import type { PipelineModel } from "./model.ts";

function guards(model: PipelineModel): string {
  const names = model.environments.map((env) => env.name).join(", ");
  return names.length > 0 ? `only the protected environment(s) [${names}] receive the image` : "";
}

export function renderCiWorkflow(model: PipelineModel): string {
  return `# ${model.workflowName}: continuous integration on pull requests and main
# Rendered by src/workflow.ts. Replace placeholders with values for your repo.
name: ${model.workflowName}-ci

on:
  push:
    branches: [${model.mainBranch}]
  pull_request:

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'
      - run: npm ci
      - run: npm run gate

  scan:
    needs: quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
      - run: node scripts/scan-secrets.mjs

  sbom:
    needs: scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
      - run: npx @cyclonedx/cyclonedx-npm --output-file sbom.xml --output-format xml
      - uses: actions/upload-artifact@v4
        with:
          name: sbom
          path: sbom.xml
`;
}

export function renderDeployWorkflow(model: PipelineModel): string {
  const environment = model.environments[0];
  const guard = guards(model);
  const envName = environment?.name ?? "production";
  return renderDeployTemplate(model, envName, environment?.requiredReviewers ?? 1)
    .replace(/ACTOR_EXPR/g, "${{ github.actor }}")
    .replace(/TOKEN_EXPR/g, "${{ secrets.GITHUB_TOKEN }}")
    .replace(/SHA_EXPR/g, "${{ github.sha }}")
    .replace(/KUBECONFIG_EXPR/g, "${{ secrets.KUBECONFIG }}")
    .replace(/GUARD_PLACEHOLDER/g, guard);
}

function renderDeployTemplate(
  model: PipelineModel,
  envName: string,
  requiredReviewers: number,
): string {
  return `# ${model.workflowName}: promoted deployment through an approval-protected environment
# Rendered by src/workflow.ts.
# Prerequisites:
# - the image repository grants the github-actions identity push access;
# - ${envName} environment protection requires at least
#   ${requiredReviewers} reviewer(s); the deployment only starts
#   after the reviewer approves (configure this under Repository Settings > Environments);
# - cluster access is provided through the KUBECONFIG secret below, never embedded here.
name: ${model.workflowName}-deploy

on:
  push:
    branches: [${model.mainBranch}]
  workflow_dispatch:

concurrency:
  group: ${model.workflowName}-deploy
  cancel-in-progress: false

permissions:
  contents: read

env:
  REGISTRY_IMAGE: ${model.imageName}

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
      - run: npm ci
      - run: npm run gate

  scan:
    needs: quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node scripts/scan-secrets.mjs

  build:
    needs: scan
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - name: Log in to the container registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ACTOR_EXPR
          password: TOKEN_EXPR
      - name: Build and push the immutable image
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: $REGISTRY_IMAGE:SHA_EXPR

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: ${envName}
    steps:
      - name: Set the image and roll out
        run: |
          kubectl set image deployment/service service=$REGISTRY_IMAGE:SHA_EXPR -n apps
          kubectl rollout status deployment/service -n apps --timeout=5m
        env:
          KUBECONFIG: KUBECONFIG_EXPR
      - name: Summarize the change
        run: echo "deployed $REGISTRY_IMAGE:SHA_EXPR" >> "$GITHUB_STEP_SUMMARY"

# Safety note: GUARD_PLACEHOLDER. Artifacts carry the immutable git sha as the tag.
`;
}