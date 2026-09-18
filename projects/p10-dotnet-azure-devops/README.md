# p10-dotnet-azure-devops

A .NET build and release plan for Azure DevOps, presented as a small
TypeScript toolchain: a project model with validation, a csproj checker that
runs without the dotnet SDK, and a renderer that emits an approval-gated
`azure-pipelines.yml` plus an operational runbook.

Topic note: inspired by DevOps-Projects (project-10-dotnet-azure-devops, MIT).
The implementation is original; only the theme, a .NET release on Azure DevOps
with a tested build stage and a guarded deployment, matches the referenced
project. Model, parser, YAML and notes are written from scratch.

## What it does

- src/model.ts
  The build plan: solution, project and test project paths, target framework
  (`8.0`, `9.0`), release environments, App Service name and main branch.
  `validateModel` reports broken plans (areas: paths, framework format,
  duplicate environments).

- src/xml.ts
  A small regex-based csproj reader: extracts `<TargetFrameworks?>` values and
  `<PackageReference Include/Version>` entries, and compares them against the
  planned framework, flagging a missing target framework and duplicate
  references. It needs no dotnet installation, so it runs in CI and unit tests
  on any machine.

- src/pipeline.ts
  Renders `azure-pipelines.yml` for the plan: a Build stage (restore, build,
  test with trx results, publish, artifact upload) and a Release stage
  (`deployment` job) that deploys to Azure App Service. The release environment
  owns the approval check; the service connection and App Service name arrive
  as pipeline variables, never as literal values.

- src/cli.ts
  `--check` validates the plan, the bundled sample csproj and the generated
  pipeline for embedded secrets (pattern-based, no network). `--workflow` and
  `--notes` (with `--out`) emit the YAML and the runbook.

## Usage

Requirements: Node.js 24.

1. npm ci
2. npm run verify
3. npm run check

Render the pipeline and the runbook:

npm run cli -- --workflow --out azure-pipelines.yml
npm run cli -- --notes --out runbook.md

## Design notes

- The generated pipeline never deploys outside the main branch (trigger
  include list) and never embeds credentials; the environment approval is
  configured in Azure DevOps, not in the file.
- Validation and rendering split cleanly, so a future web UI or a CLI flag can
  reuse the same functions.
- The csproj checker is deliberately conventional: it reads the typical
  single-/multi-target and PackageReference shape and reports what it cannot
  interpret honestly.