# p12-super-mario-k8s

An original side-scrolling runner game with a headless engine and Kubernetes
delivery. The engine simulates physics and obstacle progress deterministically
(seeded), serves a replay over HTTP, renders ASCII frames for the terminal,
and ships repeatable Kubernetes manifests with the Dockerfile.

Topic note: inspired by DevOps-Projects (project-12-super-mario-k8s, MIT,
DevCloudNinjas). The implementation here is original.

## What it does

- src/game.ts — the runner engine:
  - gravity-driven jump arc with single-hop control,
  - deterministic obstacle spawning from a seeded PRNG,
  - collision, scoring (obstacles cleared) and a run-over state,
  - an auto-jump bot (`autoJumpPolicy`) for headless demos and tests.
- src/render.ts — deterministic ASCII frame renderer for the terminal.
- src/k8s.ts — Kubernetes delivery: namespace, Deployment with probes and
  resource requests, Service, HorizontalPodAutoscaler and a ConfigMap for the
  game settings, plus apply/preview notes.
- src/server.ts — zero-dependency HTTP server: serves the page and exposes
  `/api/health` and `/api/sim` (headless replay as JSON).
- src/cli.ts — `--check` verifies engine invariants, `--sim` prints a frame,
  `--manifests` renders the Kubernetes YAML, `--serve` starts the server.
- Dockerfile and static/index.html — the container image and the demo page.

## Usage

Requirements: Node.js 24.

1. npm ci
2. npm run verify
3. npm run check

Replay the default seed headlessly and print the final frame:

npm run cli -- --sim 60

Render the Kubernetes manifests:

npm run cli -- --manifests --out manifests.yaml

Serve the demo:

npm run serve
# open http://localhost:8080

## Running on Kubernetes (optional)

Apply the manifests in any cluster (kind, minikube, EKS):

kubectl apply -f manifests.yaml
kubectl port-forward -n games svc/runner-game 8080:80

Secrets are never part of the delivery; the manifests only reference the public
image. Replace the image reference with your registry build before applying.