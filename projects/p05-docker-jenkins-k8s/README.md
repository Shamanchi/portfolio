# p05-docker-jenkins-k8s

Original planner that connects a containerized application to Kubernetes
through a Jenkins declarative pipeline. It models the release flow (build,
push, deploy, rollout), renders a Jenkinsfile, and generates Kubernetes
Deployment + Service manifests.

Topic note: inspired by DevOps-Projects (project-05-docker-jenkins-k8s, MIT,
DevCloudNinjas). The implementation is original; the "container image through
Jenkins into Kubernetes" theme matches the referenced project.

## What it does

- src/pipeline.ts
  PipelineConfig model, validation, the ordered stage sequence, and a
  declarative-pipeline renderer. The image registry credentials are never
  stored as plain text: the Jenkinsfile uses withCredentials with a credential
  id that you configure in Jenkins.

- src/manifests.ts
  Deployment with rolling update (maxUnavailable 0), readiness and liveness
  probes on /healthz, CPU and memory requests/limits, plus a ClusterIP
  Service. Output is YAML-ready multi-document JSON.

- src/cli.ts
  Validate, or write the Jenkinsfile, the manifests, and a release checklist.

## Artifacts and placeholders

Rendered outputs are scaffolding for your own repository:

- registry.example.com is a placeholder registry host: replace it with your
  ECR, Docker Hub, or private registry domain.
- registry-credentials is the default Jenkins credential id; set it to the id
  you actually configure in Jenkins credentials store.
- The IMAGE_TAG parameter (default latest) drives build, push, and set image.

## Usage

Requirements: Node.js 24.

1. npm ci
2. npm run verify

Validate the default model:

npm run check

Render the Jenkinsfile:

npm run cli -- --pipeline

Render the Kubernetes manifests:

npm run cli -- --manifests

Write both to files:

npm run cli -- --pipeline --out Jenkinsfile
npm run cli -- --manifests --out k8s-manifests.json

Apply the manifests:

kubectl -n apps apply -f k8s-manifests.json

## What the pipeline does end to end

- build: docker build of the appPath directory, tagged with the release tag.
- push: logs in to the registry via the Jenkins credential, then docker push.
- deploy: kubectl set image on the Deployment, then a restart to pick up any
  configuration changes.
- rollout: waits for the new ReplicaSet to become available with a timeout.

For a real deployment you additionally need a cluster reachable by Jenkins
(kubeconfig or eks context), a container registry, and the app image that
serves /healthz.