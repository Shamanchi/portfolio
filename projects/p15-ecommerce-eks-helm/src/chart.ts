import type { ChartValues } from "./model.ts";

const HELM_EXPRESSION = /\{\{\s*([^{}]+?)\s*\}\}/g;

export class RenderError extends Error {}

export interface ChartFile {
  path: string;
  content: string;
}

export function interpolate(template: string, values: ChartValues, releaseName: string): string {
  return template.replace(HELM_EXPRESSION, (whole, expression: string) => {
    const trimmed = expression.trim();
    if (trimmed === ".Release.Name") return releaseName;
    if (trimmed.startsWith(".Values.")) {
      const value = valueAtPath(values, trimmed.slice(".Values.".length));
      if (value === undefined) throw new RenderError(`unsupported template path ${trimmed}`);
      return String(value);
    }
    throw new RenderError(`unsupported template expression {{ ${trimmed} }}`);
  });
}

function valueAtPath(values: ChartValues, path: string): unknown {
  let cursor: unknown = values;
  for (const segment of path.split(".")) {
    if (typeof cursor !== "object" || cursor === null || !(segment in cursor)) {
      return undefined;
    }
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor;
}

const DEPLOYMENT = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}-api
  namespace: {{ .Values.namespace }}
  labels:
    app: {{ .Values.labels.app }}
spec:
  replicas: {{ .Values.replicas }}
  selector:
    matchLabels:
      app: {{ .Values.labels.app }}
  strategy:
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
  template:
    metadata:
      labels:
        app: {{ .Values.labels.app }}
    spec:
      containers:
        - name: api
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - containerPort: {{ .Values.service.targetPort }}
          readinessProbe:
            httpGet:
              path: /healthz
              port: {{ .Values.service.targetPort }}
          resources:
            requests:
              cpu: {{ .Values.resources.requests.cpu }}
              memory: {{ .Values.resources.requests.memory }}
            limits:
              cpu: {{ .Values.resources.limits.cpu }}
              memory: {{ .Values.resources.limits.memory }}
          envFrom:
            - secretRef:
                name: {{ .Values.secretName }}
            - configMapRef:
                name: {{ .Release.Name }}-config
`;

const SERVICE = `apiVersion: v1
kind: Service
metadata:
  name: {{ .Release.Name }}-api
  namespace: {{ .Values.namespace }}
spec:
  selector:
    app: {{ .Values.labels.app }}
  ports:
    - port: {{ .Values.service.port }}
      targetPort: {{ .Values.service.targetPort }}
`;

const INGRESS = `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ .Release.Name }}-api
  namespace: {{ .Values.namespace }}
spec:
  rules:
    - host: {{ .Values.ingress.host }}
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: {{ .Release.Name }}-api
                port:
                  number: {{ .Values.service.port }}
`;

const HPA = `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: {{ .Release.Name }}-api
  namespace: {{ .Values.namespace }}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: {{ .Release.Name }}-api
  minReplicas: {{ .Values.hpa.minReplicas }}
  maxReplicas: {{ .Values.hpa.maxReplicas }}
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: {{ .Values.hpa.cpuUtilization }}
`;

const CONFIGMAP = `apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-config
  namespace: {{ .Values.namespace }}
data:
  DB_HOST: {{ .Values.config.dbHost }}
  REPORT_SCHEDULE: "{{ .Values.config.reportSchedule }}"
`;

const CHART_YAML = `apiVersion: v2
name: ecommerce-api
description: E-commerce API workload for EKS
type: application
version: 0.1.0
appVersion: "{{ .Values.image.tag }}"
`;

export function renderChart(values: ChartValues, releaseName = "shop"): ChartFile[] {
  const enabled: [string, string, boolean][] = [
    ["templates/deployment.yaml", DEPLOYMENT, true],
    ["templates/service.yaml", SERVICE, true],
    ["templates/ingress.yaml", INGRESS, values.ingress.enabled],
    ["templates/hpa.yaml", HPA, values.hpa.enabled],
    ["templates/configmap.yaml", CONFIGMAP, true],
  ];

  const files: ChartFile[] = [
    { path: "Chart.yaml", content: interpolate(CHART_YAML, values, releaseName) },
    { path: "Chart.lock", content: "dependencies: []\n" },
  ];
  for (const [path, template, include] of enabled) {
    if (include) {
      files.push({ path, content: interpolate(template, values, releaseName) });
    }
  }
  return files;
}

export function renderValuesYaml(values: ChartValues): string {
  return `replicas: ${values.replicas}
image:
  repository: ${values.image.repository}
  tag: ${values.image.tag}
  pullPolicy: ${values.image.pullPolicy}
resources:
  requests:
    cpu: ${values.resources.requests.cpu}
    memory: ${values.resources.requests.memory}
  limits:
    cpu: ${values.resources.limits.cpu}
    memory: ${values.resources.limits.memory}
hpa:
  enabled: ${values.hpa.enabled}
  minReplicas: ${values.hpa.minReplicas}
  maxReplicas: ${values.hpa.maxReplicas}
  cpuUtilization: ${values.hpa.cpuUtilization}
ingress:
  enabled: ${values.ingress.enabled}
  host: ${values.ingress.host}
config:
  dbHost: ${values.config.dbHost}
  reportSchedule: ${values.config.reportSchedule}
secretName: ${values.secretName}
service:
  port: ${values.service.port}
  targetPort: ${values.service.targetPort}
`;
}