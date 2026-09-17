# Shamanchi — DevOps and AI Engineering Portfolio

Public portfolio of Pavel Yrevich (github.com/Shamanchi). Every project here is
built by the author around a real problem and runs on Windows without paid
services by default. External clouds and APIs are optional: they connect only
through environment variables, and CI stays green without any key.

The repository is assembled by the CodexHub swarm: an orchestrator plus worker
and auditor agents, one task at a time, with a quality gate before every
acceptance. Details: docs/CODEXHUB_SWARM.md.

## Status

- Quality gate: local one-command check, also wired into GitHub Actions.
- Wave 1 (scaffold): done.
- Projects: filled batch by batch; catalog in docs/КАТАЛОГ_ПОРТФОЛИО.md.

## Skills and stack

Infrastructure as code (Terraform), containers (Docker), orchestration
(Kubernetes), CI/CD (GitHub Actions, Jenkins, Azure DevOps), cloud network
design (AWS), serverless, observability, DevSecOps, AI agents and RAG,
electron-based desktop tooling, strict TypeScript, PowerShell. See
docs/STACK.md for the full profile.

## Repository layout

- projects/ — independent projects. Each has its own README, tests and CI step.
- docs/ — documentation and runbooks (Russian).
- scripts/ — quality gate and secret scanner.
- .github/workflows/ci.yml — CI definition.

## Quick start

Requirements: git, Node.js 24+, npm.

1. Clone the repository.
2. npm ci
3. npm run gate

The gate typechecks and tests every project under projects/ and scans the whole
repository for secrets and internal paths.

## Running one project

A project is self-contained:

1. cd projects/<project>
2. npm ci
3. npm run verify (or npm test)

See the README of the concrete project for specifics.

## Security

- Keys are read from environment variables only.
- .env is never committed; .env.example documents the expected variables.
- CI runs without keys; network steps are optional and never break the build.
- Run npm run secrets anytime.

Runbooks: docs/SECRETS_RUNBOOK.md, docs/COST_LIMITS_RUNBOOK.md.

## Contributing

Read CONTRIBUTING.md first. Attribution policy is fixed in NOTICE.md: topics
come from public repositories, implementations are original.

## License

MIT. See LICENSE. Third-party attribution, if any: NOTICE.md.