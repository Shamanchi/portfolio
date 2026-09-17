# p04-django-aws-ecs

Original planner for deploying a containerized Django application to AWS ECS
Fargate. It models the application, renders an ECS task definition, and emits a
Terraform module that creates the cluster, service, log group and CPU-based
autoscaling. No AWS account is required to use this project.

Topic note: inspired by DevOps-Projects (project-07-django-deploy-ecs, MIT,
DevCloudNinjas). The implementation is original and the theme ("Django on ECS
Fargate") is shared with the referenced DevOps-Projects project.

## What it does

- src/model.ts
  The DjangoApp model, the default profile, the set of valid Fargate
  cpu/memory pairs, and invariant validation (names, ranges, environment vs
  secret keys).

- src/taskdef.ts
  Builds the ECS task definition object: awsvpc network mode, Fargate
  compatibility, awslogs, container health check, plain-text environment keys
  only for non-secrets. Password and secret-key values are referenced via the
  secrets field (Secrets Manager / SSM paths) and never embedded.

- src/terraform.ts
  Renders a Terraform module: ECS cluster, CloudWatch log group, task
  definition, service with load balancer, and an Application Auto Scaling
  target + target-tracking policy on average CPU.

- src/cli.ts
  Validate the model or print artifacts.

## Artifacts

Artifacts contain clearly marked placeholders that you replace with real
values when you deploy:

- ACCOUNT_ID_PLACEHOLDER: your AWS account id.
- STATE_BUCKET_PLACEHOLDER / REGION_PLACEHOLDER: your S3 backend.
- arn:aws:iam::ACCOUNT_ID_PLACEHOLDER:role/<app>-execution
  and ...-task: IAM roles you must create.

Roles are intentionally left as placeholders because real deployments wire
them to their own IAM policies and the state backend differs per account.

## Usage

Requirements: Node.js 24.

1. npm ci
2. npm run verify

Validate the default model:

npm run check

Print the task definition JSON:

npm run cli -- --taskdef

Print the Terraform module:

npm run cli -- --terraform

Write an artifact to a file:

npm run cli -- --taskdef --out task-definition.json

## Notes for running in your own repository

The generated task definition JSON and Terraform module are scaffolding, not a
turnkey deploy. To go to production you still need, outside this tool:

- an ECR repository and pushed image (image tag is configurable).
- an ALB target group and HTTPS listener (target_group_arn input).
- private subnets and a security group (terraform vars).
- execution and task IAM roles granting ECR pull, logs, and secret read
  access.
- the Django codebase that responds on /healthz/ and reads the same
  environment variables.

These pieces stay out of scope so the tool stays a portable, honest planner.