import type { AksPipelineConfig } from "./config.ts";

export interface NodeReadiness {
  name: string;
  ready: boolean;
}

export type ClusterStatus = "healthy" | "degraded" | "unready";

export interface ClusterEvaluation {
  status: ClusterStatus;
  reason: string;
}

export function evaluateCluster(nodes: NodeReadiness[], requiredReady: number): ClusterEvaluation {
  const ready = nodes.filter((node) => node.ready).length;
  if (nodes.length < requiredReady) {
    return {
      status: "unready",
      reason: `only ${nodes.length} node(s) registered, need ${requiredReady}`,
    };
  }
  if (ready === nodes.length) {
    return {
      status: "healthy",
      reason: `all ${ready}/${nodes.length} nodes ready`,
    };
  }
  if (ready >= requiredReady) {
    return {
      status: "degraded",
      reason: `healthy enough (${ready} ready) but ${nodes.length - ready} node(s) not ready`,
    };
  }
  return {
    status: "unready",
    reason: `${ready}/${nodes.length} ready; ${requiredReady} required for delivery readiness`,
  };
}

export function renderPipeline(config: AksPipelineConfig): string {
  const registry = `${config.acrName}.azurecr.io`;
  return `trigger:
  branches:
    include:
      - main

variables:
  resourceGroup: '${config.resourceGroup}'
  clusterName: '${config.clusterName}'
  registry: '${registry}'
  image: '${registry}/${config.serviceName}'
  namespace: '${config.namespace}'
  helmRelease: '${config.helmRelease}'
  acrServiceConnection: '${config.acrServiceConnection}'
  kubeServiceConnection: '${config.kubeServiceConnection}'

stages:
- stage: build
  displayName: Build and push image
  jobs:
  - job: build
    pool: ubuntu-latest
    steps:
    - task: AzureCLI@2
      displayName: Build image in ACR
      inputs:
        azureSubscription: $(acrServiceConnection)
        scriptType: bash
        scriptLocation: inlineScript
        inlineScript: |
          az acr build \\
            --registry $(registry) \\
            --image images/${'$'}{BUILD_SOURCEBRANCHNAME}:${'$'}{BUILD_BUILDID} .

- stage: deploy_dev
  displayName: Deploy to dev (${config.location})
  dependsOn: build
  jobs:
  - deployment: DeployDev
    environment: shop-dev
    strategy:
      runOnce:
        deploy:
          steps:
          - task: AzureCLI@2
            displayName: Helm upgrade in dev
            inputs:
              azureSubscription: $(kubeServiceConnection)
              scriptType: bash
              scriptLocation: inlineScript
              inlineScript: |
                az aks get-credentials \\
                  --resource-group $(resourceGroup) \\
                  --name $(clusterName) \\
                  --overwrite-existing
                helm upgrade --install $(helmRelease) ./chart \\
                  --namespace $(namespace) --create-namespace \\
                  --set image.tag=${'$'}{BUILD_BUILDID}
                kubectl rollout status deployment/$(helmRelease)-api \\
                  -n $(namespace) --timeout=5m

- stage: deploy_prod
  displayName: Deploy to prod after approval
  dependsOn: deploy_dev
  condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
  jobs:
  - deployment: DeployProd
    environment: shop-prod
    strategy:
      runOnce:
        deploy:
          steps:
          - task: AzureCLI@2
            displayName: Helm upgrade in prod
            inputs:
              azureSubscription: $(kubeServiceConnection)
              scriptType: bash
              scriptLocation: inlineScript
              inlineScript: |
                az aks get-credentials \\
                  --resource-group $(resourceGroup) \\
                  --name $(clusterName) \\
                  --overwrite-existing
                helm upgrade --install $(helmRelease) ./chart \\
                  --namespace $(namespace) \\
                  --set image.tag=${'$'}{BUILD_BUILDID}
                kubectl rollout status deployment/$(helmRelease)-api \\
                  -n $(namespace) --timeout=10m
`;
}

export function renderAksCheatsheet(config: AksPipelineConfig): string {
  return `# AKS + Azure DevOps cheat sheet (${config.clusterName})

Identity never lives in the pipeline: Azure DevOps uses the AzureCLI tasks with
the ${config.acrServiceConnection} and ${config.kubeServiceConnection} service
connections, and Azure RBAC carries the access.

az acr show --name ${config.acrName} --resource-group ${config.resourceGroup}
az aks get-credentials --resource-group ${config.resourceGroup} --name ${config.clusterName} --overwrite-existing
kubectl get nodes
kubectl get pods -n ${config.namespace}
helm list -n ${config.namespace}

The prod stage is gated by the shop-prod environment approvals and only runs
from refs/heads/main after dev has a green rollout.
`;
}