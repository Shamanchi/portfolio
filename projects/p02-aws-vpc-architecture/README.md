# p02-aws-vpc-architecture

VPC network architecture as code. Plans a multi-AZ AWS VPC: public web
subnets, private app and database subnets, a NAT gateway per availability zone,
and route tables that keep private tiers offline from the internet. Renders
everything to deterministic Terraform HCL. Runs fully locally: no account, no
keys.

Topic note: inspired by DevOps-Projects (project-02-aws-vpc-architecture, MIT,
DevCloudNinjas). The implementation here is original.

## What it does

- TypeScript model: region, CIDR, availability zones, subnet sizes per tier.
- Plans one block per tier per AZ and validates the layout:
  - prefixes must be deeper than the VPC prefix,
  - the whole layout must fit into the VPC CIDR,
  - availability zones must be valid and unique.
- Computes route table design: public tables out to the internet gateway,
  private tables out to the per-AZ NAT gateway.
- Renders HCL: VPC, subnets, internet gateway, EIPs, NAT gateways, route
  tables, associations and an output stub with the public subnet ids.

## Layout

- src/ip.ts — IPv4 and CIDR primitives.
- src/topology.ts — the model, planning and validation.
- src/hcl.ts — Terraform HCL renderer.
- src/cli.ts — command line entry point.
- tests/topology.test.ts — allocation, validation and rendering tests.

## Usage

Requirements: Node.js 24.

1. npm ci
2. npm run verify

Render the default network (3 AZ, web /24, app /24, db /26 per AZ):

npm run cli

Customize:

npm run cli -- --name my-vpc --region us-east-2 --cidr 10.20.0.0/16 --azs a,c

## Applying to AWS (optional)

Save the output into a .tf file and run terraform plan in a sandbox account.
Keys and network access are never required by the local path.