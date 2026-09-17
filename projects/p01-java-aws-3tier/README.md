# p01-java-aws-3tier

Three-tier architecture as code. A typed model, CIDR planning and validation for
a classic web / app / database layout, rendered to Terraform HCL. The project
demonstrates infrastructure-as-code thinking without requiring an AWS account:
everything runs locally on Windows with Node.js.

Topic note: inspired by DevOps-Projects (project-01-java-aws-3tier, MIT,
DevCloudNinjas). The implementation here is original.

## What it does

- Takes a three-tier layout (web, app, db) as typed configuration.
- Plans non-overlapping subnets inside a VPC CIDR block.
- Validates the model: region, prefixes, instance counts, allocation fits.
- Renders deterministic Terraform HCL: VPC, subnets across availability zones,
  internet gateway, route table, security groups with least-privilege rules,
  EC2 instances for web and app tiers, and a PostgreSQL RDS instance.
- The db tier is private: its security group accepts traffic only from the app
  tier security group; the app tier only from the web tier.

## Layout

- src/cidr.ts — IPv4 and subnet allocation primitives.
- src/model.ts — architecture model and validation.
- src/hcl.ts — Terraform HCL renderer.
- src/cli.ts — command line entry point.
- tests/infra.test.ts — tests for allocation, validation and rendering.

## Usage

Requirements: Node.js 24.

1. npm ci
2. npm run verify

The verify command runs the typecheck and the test suite.

Render the default architecture to stdout:

npm run cli

Customize the profile:

npm run cli -- --name my-app --region eu-central-1 --vpc-cidr 10.20.0.0/16

## Applying to AWS (optional)

The rendered HCL is intended for a sandbox account. To use it:

1. Save the output of npm run cli into a .tf file.
2. Run terraform init and terraform plan in an AWS sandbox account.
3. Real keys are never required by this project; the local path is fully offline.