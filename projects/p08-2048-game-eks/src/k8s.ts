export interface K8sSettings {
  image: string;
  domain: string;
  replicas: number;
  namespace: string;
}

export const DEFAULT_K8S: K8sSettings = {
  image: "REGISTRY_PLACEHOLDER/2048:latest",
  domain: "game.example.com",
  replicas: 2,
  namespace: "games",
};

export function renderManifests(settings: K8sSettings): string {
  const deployment = {
    apiVersion: "apps/v1",
    kind: "Deployment",
    metadata: { name: "2048", namespace: settings.namespace, labels: { app: "2048" } },
    spec: {
      replicas: settings.replicas,
      selector: { matchLabels: { app: "2048" } },
      strategy: { type: "RollingUpdate" },
      template: {
        metadata: { labels: { app: "2048" } },
        spec: {
          containers: [
            {
              name: "2048",
              image: settings.image,
              imagePullPolicy: "IfNotPresent",
              ports: [{ containerPort: 8080, name: "http" }],
              readinessProbe: { httpGet: { path: "/api/state", port: 8080 }, periodSeconds: 10 },
              livenessProbe: { httpGet: { path: "/api/state", port: 8080 }, timeoutSeconds: 3 },
              resources: {
                requests: { cpu: "100m", memory: "64Mi" },
                limits: { cpu: "250m", memory: "128Mi" },
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
    metadata: { name: "2048", namespace: settings.namespace, labels: { app: "2048" } },
    spec: {
      type: "ClusterIP",
      selector: { app: "2048" },
      ports: [{ name: "http", port: 8080, protocol: "TCP" }],
    },
  };

  const ingress = {
    apiVersion: "networking.k8s.io/v1",
    kind: "Ingress",
    metadata: { name: "2048", namespace: settings.namespace, labels: { app: "2048" } },
    spec: {
      ingressClassName: "alb",
      rules: [
        {
          host: settings.domain,
          http: {
            paths: [
              {
                path: "/",
                pathType: "Prefix",
                backend: { service: { name: "2048", port: { number: 8080 } } },
              },
            ],
          },
        },
      ],
    },
  };

  return [deployment, service, ingress].map((doc) => JSON.stringify(doc, null, 2)).join("\n---\n") + "\n";
}

export function renderApplyNotes(settings: K8sSettings): string {
  return [
    `# Apply the manifests above:`,
    `# kubectl apply -n ${settings.namespace} -f <file>`,
    ``,
    `# The ingress carries ingressClassName "alb" (AWS Load Balancer Controller).`,
    `# Point ${settings.domain} at the ALB address the controller creates, or`,
    `# swap ingressClassName for your own ingress class.`,
    `# Replace REGISTRY_PLACEHOLDER/2048:latest with your built and pushed image.`,
    `# Build your image from the Dockerfile at the project root.`,
  ].join("\n");
}