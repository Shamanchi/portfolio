# p13-zomato-clone-devsecops

An original food-delivery demo that treats a simple ordering app as the subject
of a DevSecOps pipeline: a validated dish catalog with stock-aware orders, a
small built-in SAST scanner, a GitHub Actions workflow that gates images behind
quality checks, a Trivy scan and a build, plus a containerized HTTP demo.

Topic note: inspired by DevOps-Projects (project-13-zomato-clone-devsecops,
MIT, DevCloudNinjas). The implementation here is original.

## What it does

- src/catalog.ts — the menu model: dishes with category, price and stock,
  validation rules, filtering helpers and `placeOrder` with quantity and
  stock checks.
- src/sast.ts — a lightweight static scanner (5 rules: dynamic execution,
  shell invocation, hard-coded credentials, plain-text passwords, referenced
  `.env` files) that runs over the application sources.
- src/pipeline.ts — renders the DevSecOps workflow: quality, SAST and an
  image-scan job run on every PR; the build job pushes the image only on the
  default branch, and only after the scan passes. The cheat sheet explains the
  release flow.
- src/app.ts — zero-dependency HTTP server: the demo page plus `/api/health`,
  `/api/menu` and `POST /api/order` (stock-aware, returns 409 on rejection).
- src/cli.ts — `--check` validates the menu and scans the sources and the
  workflow for secrets, `--menu` prints the catalog, `--workflow`/`--notes`
  render the CI files, `--serve` starts the demo.
- Dockerfile — non-root runs happen under the fixed Node 24 image.

## Usage

Requirements: Node.js 24.

1. npm ci
2. npm run verify
3. npm run check

Checks that the menu is valid and the sources carry no literal credentials or
dynamic code:

npm run cli -- --check

Render the workflow and the release cheat sheet:

npm run cli -- --workflow --out .github/workflows/devsecops.yml
npm run cli -- --notes

Run the demo:

npm run serve
# http://localhost:8080

## Security posture

The check gate is the same one CI runs: the scanner never matches its own
ruleset, the workflow only ever references GitHub-managed tokens, and actual
secrets never live in the repository. Image promotion happens only after the
Trivy filesystem scan reports no HIGH or CRITICAL issues.