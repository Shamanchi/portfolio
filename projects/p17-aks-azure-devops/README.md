# p17-aks-azure-devops

An original Azure delivery demo: an Azure DevOps pipeline that builds an image
in ACR and helm-deploys it to AKS behind environment approvals, plus a cluster
readiness engine that decides whether a rollout is safe.

Topic note: inspired by DevOps-Projects (project-17-aks-azure-devops, MIT,
DevCloudNinjas). The implementation here is original.

## What it does

- src/config.ts — the delivery model (service, resource group, AKS cluster,
  ACR name, namespace, service connections) with validation: DNS-1123 labels,
  globally unique ACR names, location and connection references by id.
- src/aks.ts — renders `azure-pipelines.yml`: a build stage that runs
  `az acr build`, a dev deployment stage, and a prod stage gated by the
  `shop-prod` environment approvals and restricted to `refs/heads/main`. Also
  evaluates cluster readiness (healthy / degraded / unready) from node state.
- src/cli.ts — `--check` validates the model, renders the pipeline and asserts
  no credential-shaped strings; `--pipeline`, `--cluster` and `--notes` expose
  the artifacts.

## Usage

Requirements: Node.js 24.

1. npm ci
2. npm run verify
3. npm run check

Render the Azure Pipeline and the cheat sheet:

npm run cli -- --pipeline --out azure-pipelines.yml
npm run cli -- --notes

Ask the readiness engine:

npm run cli -- --cluster --nodes n1=true,n2=true,n3=true,n4=false

## Identity posture

Azure DevOps tasks run through the `acr-push` and `aks-shop` service
connections referenced as `$(acrServiceConnection)` / `$(kubeServiceConnection)`
variables — the connection ids, never tokens. Prod delivery additionally needs
a manual environment approval before the rollout.