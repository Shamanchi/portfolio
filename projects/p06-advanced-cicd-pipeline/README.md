# p06-advanced-cicd-pipeline

Original generator for an advanced CI/CD pipeline: quality gates, secret scan,
SBOM export, immutable image build, and a deployment that only starts after an
approval-protected environment review. Renders GitHub Actions workflows.

Topic note: inspired by DevOps-Projects (project-06-advanced-cicd-pipeline,
MIT, DevCloudNinjas). The implementation is original and follows the same
theme: a hardened pipeline with gates before release.

## What it does

- src/model.ts
  PipelineModel: workflow name, image name, release environments with a
  required-reviewer count, and an ordered list of stages (quality, scan, sbom,
  build, promote). validation rejects duplicates, unknown stages, empty
  environments, and reviewers below 1.

- src/workflow.ts
  Renders two workflows from the model:
  - CI workflow: quality (npm run gate), secret scan with the repository's own
    scripts/scan-secrets.mjs, and SBOM generation uploaded as an artifact.
  - Deploy workflow: quality and scan gates, immutable image build pushed to
    GHCR tagged with the git sha, then a deploy job pinned to the production
    environment. GitHub environment protection rules give the approval gate.

- src/cli.ts
  Validate the model or write the rendered workflows to files.

## Placeholders to replace

The rendered YAML is scaffolding for your repository:

- ghcr.io/shamanchi/portfolio/service is the registry image; change the owner
  and name to your GitHub org and image.
- KUBECONFIG is the name of a repository secret containing your kubeconfig;
  name it the way your repo expects.
- kubectl is assumed available in the runner; add a step that installs/uses
  your cluster access tool if your setup differs.
- The promotion stays manual-by-design: environment protection rules must
  exist before the first deploy (Repository Settings > Environments). The
  renderer only emits environment references, never the reviewers themselves.

## Usage

Requirements: Node.js 24 and Node.js source (the sbom step of the rendered CI
uses cyclonedx-npm at runtime).

1. npm ci
2. npm run verify

Validate the default model:

npm run check

Render the CI workflow:

npm run cli -- --ci

Render the deploy workflow:

npm run cli -- --deploy

Write both:

npm run cli -- --ci --out .github/workflows/ci.yml
npm run cli -- --deploy --out .github/workflows/deploy.yml

## Design notes

- Images are immutable: the tag is the git sha, so a deployment always points
  at an exact build.
- No plain secrets appear in the workflows or the generator source; everything
  secret is referenced through GitHub Actions secrets or environment
  protection rules.