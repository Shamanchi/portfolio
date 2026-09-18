# p11-aws-2tier-terraform

AWS two-tier architecture as code. Plans the classic web + database layout on
AWS: a public web tier and a private database tier, with route tables and
security groups that keep the database reachable only from the web nodes.
Renders everything to deterministic Terraform HCL. Runs fully locally: no
account, no keys.

Topic note: inspired by DevOps-Projects (project-11-aws-2tier-terraform, MIT,
DevCloudNinjas). The implementation here is original.

## What it does

- IPv4/CIDR primitives: parse, network and range arithmetic, containment and
  overlap checks.
- A two-tier model with validation:
  - both tier CIDRs must fit inside the VPC CIDR,
  - web and database CIDRs must not overlap,
  - instance count, database port, storage and engine are range-checked.
- Renders HCL: VPC, public web subnet, private database subnet, internet
  gateway, public route table, the web/database security groups
  (database inbound from the web group only, no public database exposure),
  web instances with bootstrap user_data, an RDS instance with the AWS-managed
  master password (no password in the configuration) and outputs for the web
  addresses and the database endpoint.
  `--check` validates a plan before anything is rendered.

## Layout

- src/cidr.ts — IPv4 and CIDR primitives.
- src/model.ts — the two-tier model and validation.
- src/hcl.ts — Terraform HCL renderer.
- src/cli.ts — command line entry point.
- tests/twotier.test.ts — CIDR, validation and rendering tests.

## Usage

Requirements: Node.js 24.

1. npm ci
2. npm run verify
3. npm run check

Render the default plan (2 web nodes, PostgreSQL in a private subnet):

npm run cli

Customize:

npm run cli -- --region us-east-2 --web-cidr 10.0.10.0/24 --db-port 5432 --web-count 3

## Applying to AWS (optional)

Save the output into a .tf file, run terraform init in a sandbox account and
`terraform apply`. Credentials and network access are never required by the
local path; the RDS password is managed by AWS.