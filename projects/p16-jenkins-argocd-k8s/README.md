# p16-jenkins-argocd-k8s

An original GitOps delivery demo: a Jenkins pipeline builds and pushes the
image, updates a gitops repository, and ArgoCD auto-sync reconciles the
cluster from that repository. The project renders both sides of the loop and
adds a small drift-decision engine so the whole delivery can be verified
offline, without Jenkins or ArgoCD.

Topic note: inspired by DevOps-Projects (project-16-jenkins-argocd-k8s, MIT,
DevCloudNinjas). The implementation here is original.

## What it does

- src/config.ts — the delivery model (ArgoCD Application settings + Jenkins
  job settings) with validation: DNS-1123 names, git source URLs, sync
  automation and credential references by id only.
- src/argocd.ts — renders the ArgoCD `Application` manifest (project, source,
  destination, automated prune + self-heal, `PruneLast`) and an `argocd`
  CLI cheat sheet.
- src/ci.ts — renders a declarative Jenkinsfile: build, push with a Jenkins
  credential id, update the gitops repo with `yq` and push the change that
  ArgoCD watches; plus the credential contract notes.
- src/gitops.ts — the sync decision engine: given the desired and live image
  tags and namespaces it returns `noop`, `sync` or `blocked`, so namespace
  drift never turns into a destructive auto-prune.
- src/cli.ts — `--check` validates the model, renders both artifacts determin
  istically and asserts no credential-shaped strings; `--app`, `--jenkins`
  and `--drift` expose the pieces.

## Usage

Requirements: Node.js 24.

1. npm ci
2. npm run verify
3. npm run check

Render the ArgoCD Application and CLI notes:

npm run cli -- --app --out argocd-app.yaml

Render the Jenkinsfile:

npm run cli -- --jenkins

Ask the drift engine what a rollout would do:

npm run cli -- --drift --desired 2.0.0 --live 1.9.9

## GitOps loop

Jenkins never touches the cluster. It pushes the desired state into
`Shamanchi/shop-gitops` at `environments/prod`; ArgoCD sees the new tag and
reconciles. The loop-mode explanation (`--drift`) documents the automation.
Credential ids (never values) are the only registry references in the
pipeline.