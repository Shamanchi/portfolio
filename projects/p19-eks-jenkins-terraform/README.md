# p19-eks-jenkins-terraform

An original infrastructure-as-code demo: a Terraform-based EKS stack with a
Jenkins helm release, an apply-plan simulator that maps observed cluster state
to a concrete action, and a brace-balance sanity check.

Topic note: inspired by DevOps-Projects (project-19-eks-jenkins-terraform, MIT,
DevCloudNinjas). The implementation here is original.

## What it does

- src/model.ts — the stack model (region, cluster version, node group sizing,
  instance types, disk size, Jenkins namespace) with validation.
- src/terraform.ts — renders `main.tf` (S3 backend, AWS provider, VPC, two pod
  subnets, EKS cluster, node group, Jenkins helm release), `outputs.tf` and an
  apply sheet; `decideApply` turns drift into create / update / destroy / noop,
  `braceBalance` verifies the template braces.
- src/cli.ts — `--check` validates the model, renders the stack and runs the
  plan simulator; `--render`, `--plan` and `--sheet` expose each artifact.

## Usage

Requirements: Node.js 24.

1. npm ci
2. npm run verify
3. npm run check

Render the Terraform files and the apply sheet:

npm run cli -- --render --out main.tf
npm run cli -- --sheet

Ask the plan simulator about drift:

npm run cli -- --plan

## Policy

- Credentials lead through roles/terraform by name, never inline policy dumps.
- The plan simulator treats a non-prod workspace drift as a rebuild (destroy)
  and a prod drift as an in-place update, keeping the registry stable.