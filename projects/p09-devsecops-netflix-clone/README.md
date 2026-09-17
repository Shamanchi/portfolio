# p09-devsecops-netflix-clone

An original "watch catalog" demo application wrapped in a security-first
pipeline: a tiny catalog API and page, a lightweight in-repo SAST scanner,
dependency audit wiring, and a rendered GitHub Actions workflow that runs the
checks before any image build.

Topic note: inspired by DevOps-Projects (project-09-devsecops-netflix-clone,
MIT, DevCloudNinjas). The implementation is original; only the theme, a
"streaming-like" demo app with a devsecops pipeline, matches the referenced
project. The app and all checks are written from scratch.

## What it does

- src/catalog.ts
  The demo catalog: sample titles, filtering by genre, top-rated selection,
  and item validation (slug id, allowed genres, year and rating ranges).

- src/app.ts
  A dependency-free node:http server exposing the catalog:
  - GET /api/catalog?genre=drama
  - GET /api/top?count=3
  - GET /api/health
  plus a tiny static page.

- src/sast.ts
  A lightweight own SAST scanner: four rules (dynamic code execution, shell
  exec through child_process, hardcoded api key/secret patterns, plain-text
  password) over the project sources, with file/line evidence.

- src/pipeline.ts
  Renders the GitHub Actions devsecops workflow (quality, npm audit at high,
  SAST, then image build on the default branch only) and a release practice
  cheat sheet. Nothing is deployed from a pull request; no secrets appear in
  the workflow.

- Dockerfile and static/index.html
  The container image and the demo page.

## Usage

Requirements: Node.js 24.

1. npm ci
2. npm run verify
3. npm run check

Run the local SAST check (exits non-zero on findings):

npm run check

Serve the demo locally:

npm run serve
# open http://localhost:8080

Render the workflow:

npm run cli -- --workflow --out .github/workflows/devsecops.yml

The Dockerfile builds the same demo; replace ghcr.io paths in the workflow
with your registry before using it.

## Design notes

- The check scans the three application sources (catalog, app, pipeline). The
  scanner itself is not part of the scanned set, so a rule can never trip over
  the rule definition.
- The workflow build job is push-only and builds without pushing; promotion to
  a cluster is left to an environment-gated stage like the one in
  p06-advanced-cicd-pipeline.