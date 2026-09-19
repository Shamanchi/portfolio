# p15-ecommerce-eks-helm

An original e-commerce delivery demo for EKS with Helm. The project models the
e-commerce API workload as typed values, renders a real Helm chart through a
small template renderer and ships a release plan that covers install, rollout,
roll-forward and rollback — no cluster required to verify the whole thing.

Topic note: inspired by DevOps-Projects (project-15-ecommerce-eks-helm, MIT,
DevCloudNinjas). The implementation here is original.

## What it does

- src/model.ts — the chart values model with validation: DNS-1123 names,
  replica bounds, millicore/Mi units, HPA consistency and ingress rules.
- src/chart.ts — the Helm chart (Deployment, Service, Ingress, HPA, ConfigMap,
  Chart.yaml) plus `interpolate`, a minimal template renderer that resolves
  `.Values.*` and `.Release.Name` and rejects anything unknown. `renderChart`
  renders deterministically with no leftover `{{ ... }}` expressions.
- src/eks.ts — the EKS delivery plan (kubeconfig, first install, rollout
  status, image upgrade, `helm rollback`) and the readiness contract.
- src/cli.ts — `--check` validates the defaults, renders the chart tree and
  asserts no credential-shaped strings survive; `--charts`, `--values` and
  `--notes` write the chart, values.yaml and the plan to disk.

## Usage

Requirements: Node.js 24.

1. npm ci
2. npm run verify
3. npm run check

Write the rendered chart and the values file:

npm run cli -- --charts --out chart --set replicas=5

Render only the values:

npm run cli -- --values --out values.yaml

Emit the EKS plan and readiness notes:

npm run cli -- --notes --out EKS_PLAN.md

## Delivery posture

The chart references the DB credentials by the `ecommerce-db-credentials`
Secret name; the Secret itself is created outside Helm (kubectl or
SealedSecrets) and carries no literal values here. Upgrades are always
helm-upgrade — never edits to live workloads — and rollback is one command
away.