export interface K8sConfig {
  namespace: string;
  replicas: number;
  image: string;
  cpuMax: number;
  seed: number;
  speed: number;
}

export const DEFAULT_K8S: K8sConfig = {
  namespace: "games",
  replicas: 2,
  image: "ghcr.io/shamanchi/runner-game:latest",
  cpuMax: 60,
  seed: 7,
  speed: 2,
};

export function renderManifests(config: K8sConfig): string {
  return `# Kubernetes delivery for the runner game, rendered by src/k8s.ts.
apiVersion: v1
kind: Namespace
metadata:
  name: ${config.namespace}
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: runner-game
  namespace: ${config.namespace}
spec:
  replicas: ${config.replicas}
  selector:
    matchLabels:
      app: runner-game
  template:
    metadata:
      labels:
        app: runner-game
    spec:
      containers:
        - name: game
          image: ${config.image}
          ports:
            - containerPort: 8080
          envFrom:
            - configMapRef:
                name: game-config
          livenessProbe:
            httpGet:
              path: /api/health
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
          resources:
            requests:
              cpu: 100m
              memory: 64Mi
---
apiVersion: v1
kind: Service
metadata:
  name: runner-game
  namespace: ${config.namespace}
spec:
  selector:
    app: runner-game
  ports:
    - port: 80
      targetPort: 8080
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: runner-game
  namespace: ${config.namespace}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: runner-game
  minReplicas: 2
  maxReplicas: 6
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: ${config.cpuMax}
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: game-config
  namespace: ${config.namespace}
data:
  GAME_SEED: "${config.seed}"
  GAME_SPEED: "${config.speed}"
`;
}

export function renderApplyNotes(config: K8sConfig): string {
  return `# Apply
kubectl apply -f manifests.yaml
kubectl get pods -n ${config.namespace} -w

# Local preview
kubectl port-forward -n ${config.namespace} svc/runner-game 8080:80
# open http://localhost:8080

# Expose to the internet (optional): set the Service type to LoadBalancer.
`;
}