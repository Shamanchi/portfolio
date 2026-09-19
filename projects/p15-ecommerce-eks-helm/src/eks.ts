import type { ChartValues } from "./model.ts";

export interface EksPlan {
  cluster: string;
  region: string;
}

export const DEFAULT_EKS_PLAN: EksPlan = {
  cluster: "shop-eks",
  region: "eu-central-1",
};

export function renderEksPlan(plan: EksPlan, values: ChartValues): string {
  return `# EKS delivery plan

Cluster: ${plan.cluster} in ${plan.region}. The chart targets the ${values.namespace}
namespace and replaces the image on every upgrade.

1. Point kubectl at the cluster:
   aws eks update-kubeconfig --region ${plan.region} --name ${plan.cluster}

2. First install:
   helm upgrade --install shop ./chart --namespace ${values.namespace} --create-namespace

3. Verify the rollout:
   kubectl rollout status deployment/shop-api -n ${values.namespace}
   kubectl get hpa,svc,ingress -n ${values.namespace}

4. Roll forward with a new image (never edit live workloads):
   helm upgrade shop ./chart \
     --set image.repository=ghcr.io/shamanchi/ecommerce-api \
     --set image.tag=1.5.0

5. Roll back if the readiness probe never turns green:
   helm history shop -n ${values.namespace}
   helm rollback shop <revision> -n ${values.namespace}

Database credentials live in the ${values.secretName} Secret, created outside
the chart with kubectl/SealedSecrets; the chart only references the name.
`;
}

export function renderReadinessNotes(values: ChartValues): string {
  return `# Readiness contract

The Deployment only serves traffic when /healthz on port ${values.service.targetPort}
responds. The autoscaler scales ${values.hpa.minReplicas}..${values.hpa.maxReplicas}
replicas at ${values.hpa.cpuUtilization}% CPU and the rolling update keeps one
unavailable pod at most, so the e-commerce API stays reachable during deploys.
`;
}