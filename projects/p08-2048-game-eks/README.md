# p08-2048-game-eks

Original port of the classic 2048 game: a pure TypeScript game engine, a
terminal-friendly CLI smoke check, an HTTP server with a browser UI, and
Kubernetes manifests (Deployment, Service, Ingress) to run the containerized
game on Amazon EKS.

Topic note: inspired by DevOps-Projects (project-11-2048-game-eks, MIT,
DevCloudNinjas). The game implementation, engine and manifests here are
original; only the theme (the 2048 game deployed to EKS) matches the
referenced DevOps-Projects project.

## What it does

- src/game.ts
  The whole game: 4x4 board, slide/merge along any direction (each tile can
  merge at most once per move), score, tile spawn (90% two, 10% four),
  win/lose detection. Pure functions keep it testable.

- src/server.ts
  A zero-dependency node:http server that serves static/index.html and exposes
  /api/state plus /api/move so a browser can play.

- static/index.html
  Vanilla HTML/CSS/JS page: draws the grid, listens for arrow/WASD keys, talks
  to the API, no framework involved.

- src/k8s.ts
  Renders a Deployment, a ClusterIP Service and an Ingress (ingress class
  "alb" for the AWS Load Balancer Controller) for the game image.

- Dockerfile
  node:24-alpine, runs the server with Node's built-in type stripping: no
  build step needed.

## Play locally

Requirements: Node.js 24.

1. npm ci
2. npm run verify

Start the browser game:

npm run cli -- --serve 8080

Open http://localhost:8080 and play with arrows or W/A/S/D.

## Run on EKS

1. Build and push your image (replace REGISTRY_PLACEHOLDER):

   docker build -t REPLACE_WITH_YOUR_REGISTRY/2048:latest .
   docker push REPLACE_WITH_YOUR_REGISTRY/2048:latest

2. Render the manifests:

   npm run cli -- --manifests --out manifests.yaml

   The out file contains the Deployment, Service and Ingress; when printing to
   stdout the apply notes are appended.

3. Adjust the image name inside the Deployment, ensure your ingress class name
   matches your controller, then apply:

   kubectl create namespace games
   kubectl apply -n games -f manifests.yaml

4. Point the Ingress host at the address your ingress controller / AWS Load
   Balancer Controller publishes, and open it in a browser.

## Design notes

- State lives in memory per pod; sessions are not shared across replicas.
  For a multi-replica deployment you would add a backing store; the manifests'
  readiness probe intentionally hits /api/state so any pod that fails to start
  its HTTP layer is taken out of the Service.
- The engine is a single module with no dependencies, so the game itself is
  fully covered by the engine tests and is not copied from the referenced
  DevOps-Projects repository.