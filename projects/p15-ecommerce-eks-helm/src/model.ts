export interface ChartValues {
  namespace: string;
  labels: { app: string };
  replicas: number;
  image: { repository: string; tag: string; pullPolicy: string };
  resources: {
    requests: { cpu: string; memory: string };
    limits: { cpu: string; memory: string };
  };
  hpa: { enabled: boolean; minReplicas: number; maxReplicas: number; cpuUtilization: number };
  ingress: { enabled: boolean; host: string };
  config: { dbHost: string; reportSchedule: string };
  secretName: string;
  service: { port: number; targetPort: number };
}

export const DEFAULT_VALUES: ChartValues = {
  namespace: "shop",
  labels: { app: "ecommerce-api" },
  replicas: 3,
  image: { repository: "ghcr.io/shamanchi/ecommerce-api", tag: "1.4.2", pullPolicy: "IfNotPresent" },
  resources: {
    requests: { cpu: "125m", memory: "256Mi" },
    limits: { cpu: "500m", memory: "512Mi" },
  },
  hpa: { enabled: true, minReplicas: 3, maxReplicas: 18, cpuUtilization: 70 },
  ingress: { enabled: true, host: "shop.example.com" },
  config: { dbHost: "postgres.shop.svc.cluster.local", reportSchedule: "0 3 * * *" },
  secretName: "ecommerce-db-credentials",
  service: { port: 80, targetPort: 8080 },
};

const DNS_LABEL = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;

export function validateValues(values: ChartValues): string[] {
  const problems: string[] = [];
  if (!DNS_LABEL.test(values.namespace)) problems.push("namespace must be a DNS-1123 label");
  if (!DNS_LABEL.test(values.labels.app)) problems.push("labels.app must be a DNS-1123 label");
  if (values.replicas < 1 || values.replicas > 60) problems.push(`replicas must be 1..60, got ${values.replicas}`);
  if (!/^[a-z0-9]+([.\-/][a-z0-9]+)*$/.test(values.image.repository)) problems.push("image.repository looks invalid");
  if (values.image.tag.trim() === "") problems.push("image.tag is required");
  if (!/^\d+m$/.test(values.resources.requests.cpu) || !/^\d+m$/.test(values.resources.limits.cpu)) {
    problems.push("cpu quantities must use the millicore unit");
  }
  if (!/^\d+(Mi|Gi)$/.test(values.resources.requests.memory) || !/^\d+(Mi|Gi)$/.test(values.resources.limits.memory)) {
    problems.push("memory quantities must use Mi or Gi");
  }
  if (values.hpa.enabled && (values.hpa.minReplicas < 1 || values.hpa.maxReplicas < values.hpa.minReplicas)) {
    problems.push("hpa min/max replicas are inconsistent");
  }
  if (values.hpa.cpuUtilization < 1 || values.hpa.cpuUtilization > 99) {
    problems.push(`hpa.cpuUtilization must be 1..99, got ${values.hpa.cpuUtilization}`);
  }
  if (values.ingress.enabled && values.ingress.host.trim() === "") problems.push("ingress host is required when enabled");
  if (!/^[0-9]+$/g.test(String(values.service.port)) || values.service.port < 1 || values.service.port > 65535) {
    problems.push("service.port must be a valid port");
  }
  return problems;
}