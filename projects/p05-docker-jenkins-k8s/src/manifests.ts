import type { PipelineConfig } from "./pipeline.ts";

export interface DeploymentSpec {
  image: string;
  replicas: number;
  port: number;
  healthPath: string;
  requestsCpu: string;
  requestsMemory: string;
  limitsCpu: string;
  limitsMemory: string;
}

export function defaultDeploymentSpec(pipeline: PipelineConfig): DeploymentSpec {
  return {
    image: `${pipeline.registryImage}:latest`,
    replicas: 2,
    port: 8080,
    healthPath: "/healthz",
    requestsCpu: "100m",
    requestsMemory: "128Mi",
    limitsCpu: "500m",
    limitsMemory: "512Mi",
  };
}

export function renderManifests(spec: DeploymentSpec): string {
  const deployment = {
    apiVersion: "apps/v1",
    kind: "Deployment",
    metadata: { name: "app", labels: { app: "app" } },
    spec: {
      replicas: spec.replicas,
      selector: { matchLabels: { app: "app" } },
      strategy: {
        type: "RollingUpdate",
        rollingUpdate: { maxUnavailable: 0, maxSurge: "50%" },
      },
      template: {
        metadata: { labels: { app: "app" } },
        spec: {
          containers: [
            {
              name: "app",
              image: spec.image,
              ports: [{ containerPort: spec.port, name: "http" }],
              readinessProbe: {
                httpGet: { path: spec.healthPath, port: spec.port },
                initialDelaySeconds: 5,
                periodSeconds: 10,
              },
              livenessProbe: {
                httpGet: { path: spec.healthPath, port: spec.port },
                initialDelaySeconds: 15,
                periodSeconds: 20,
              },
              resources: {
                requests: { cpu: spec.requestsCpu, memory: spec.requestsMemory },
                limits: { cpu: spec.limitsCpu, memory: spec.limitsMemory },
              },
            },
          ],
        },
      },
    },
  };

  const service = {
    apiVersion: "v1",
    kind: "Service",
    metadata: { name: "app", labels: { app: "app" } },
    spec: {
      type: "ClusterIP",
      selector: { app: "app" },
      ports: [{ name: "http", port: 80, targetPort: spec.port, protocol: "TCP" }],
    },
  };

  return `${JSON.stringify(deployment, null, 2)}\n---\n${JSON.stringify(service, null, 2)}\n`;
}

export function renderApplyBatch(namespace: string): string {
  return [
    `# Apply the rendered resources into a namespace:`,
    `# kubectl -n ${namespace} apply -f <this-file>`]
    .join("\n");
}