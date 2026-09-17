# p07-azure-devops-aks-terraform

Original generator for an Azure Kubernetes Service (AKS) footprint: a Terraform
module (azurerm) that provisions a cluster with a system node pool and
autoscaler, plus a guarded Azure DevOps pipeline with validate, plan and an
approval-gated apply.

Topic note: inspired by DevOps-Projects (project-07-azure-devops-aks-terraform,
MIT, DevCloudNinjas). The implementation is original and matches the theme:
Terraform-driven AKS behind an Azure DevOps approval gate.

## What it does

- src/model.ts
  AksModel: cluster name, location, resource group, Kubernetes version,
  network plugin (azure/kubenet), node pool with autoscaling range, and the
  protected branch. validation covers naming, version format, plugin choice and
  the autoscaling range.

- src/terraform.ts
  azurerm provider module: resource group, AKS cluster with SystemAssigned
  identity, default node pool autoscaling, RBAC, network_profile, ssh key from
  a variable (never embedded), a remote azurerm backend block with placeholder
  storage, and a sensitive kube_config output.

- src/pipeline.ts
  Azure DevOps pipeline with three stages:
  - validate: init (no backend), validate, fmt check on every PR/merge.
  - plan: real init against the backend and terraform plan emitting a tfplan
    artifact.
  - apply: runs only on the protected branch and only after a human approval in
    the 'prod-approval' environment.

- src/cli.ts
  Validate the model or write the rendered artifacts.

## Placeholders to replace

- STATE_ACCOUNT_PLACEHOLDER: the storage account that hosts the tfstate
  container 'tfstate' (both in the backend block and in the pipeline init).
- ssh_public_key / SSH_PUBLIC_KEY: the node admin key, provided through the
  'terraform-aks' variable group and terraform -var at plan time. Never commit
  a key here.
- SERVICE_CONNECTION / service principal vars: Azure integration on the runner
  uses the organization's service connection; authentication variables are
  injected by the agent, not written into the pipeline.
- 'prod-approval' environment: define approvals on it in the ADO project
  before the first run.

## Usage

Requirements: Node.js 24.

1. npm ci
2. npm run verify

Validate the default model:

npm run check

Render the Terraform module:

npm run cli -- --terraform --out infra/main.tf

Render the Azure DevOps pipeline:

npm run cli -- --pipeline --out azure-pipelines.yml

Print the release practice notes:

npm run cli -- --notes

## Design notes

- The kube_config output is marked sensitive in Terraform; never log it.
- The apply stage is gated by branch condition AND an environment approval.
- No credentials are embedded in the pipeline: the ssh key arrives from the
  variable group at plan time and Azure auth comes from the service
  connection used by the agent.