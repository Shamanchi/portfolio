import type { DjangoApp } from "./model.ts";

export interface TaskDefinitionJson {
  family: string;
  taskRoleArn: string;
  executionRoleArn: string;
  networkMode: "awsvpc";
  requiresCompatibilities: string[];
  cpu: string;
  memory: string;
  containerDefinitions: ContainerDefinitionJson[];
}

export interface ContainerDefinitionJson {
  name: string;
  image: string;
  essential: boolean;
  portMappings: Array<{ containerPort: number; protocol: string }>;
  environment: Array<{ name: string; value: string }>;
  secrets: Array<{ name: string; valueFrom: string }>;
  logConfiguration: {
    logDriver: string;
    options: Record<string, string>;
  };
  healthCheck: {
    command: string[];
    interval: number;
    timeout: number;
    retries: number;
    startPeriod: number;
  };
}

export function logGroupName(app: DjangoApp): string {
  return `/ecs/${app.appName}`;
}

export function secretName(valueFrom: string): string {
  const segments = valueFrom.split("/");
  return segments[segments.length - 1] ?? valueFrom;
}

export function buildTaskDefinition(app: DjangoApp): TaskDefinitionJson {
  const container = app.container;
  return {
    family: app.appName,
    taskRoleArn: `arn:aws:iam::ACCOUNT_ID_PLACEHOLDER:role/${app.appName}-task`,
    executionRoleArn: `arn:aws:iam::ACCOUNT_ID_PLACEHOLDER:role/${app.appName}-execution`,
    networkMode: "awsvpc",
    requiresCompatibilities: ["FARGATE"],
    cpu: String(container.cpuUnit),
    memory: String(container.memoryMiB),
    containerDefinitions: [
      {
        name: app.appName,
        image: `${container.image}:${app.imageTag}`,
        essential: true,
        portMappings: [{ containerPort: container.port, protocol: "tcp" }],
        environment: Object.entries(container.environment).map(([name, value]) => ({
          name,
          value,
        })),
        secrets: container.secrets.map((valueFrom) => ({
          name: secretName(valueFrom),
          valueFrom,
        })),
        logConfiguration: {
          logDriver: "awslogs",
          options: {
            "awslogs-group": logGroupName(app),
            "awslogs-region": app.region,
            "awslogs-stream-prefix": "django",
          },
        },
        healthCheck: {
          command: [
            "CMD-SHELL",
            `wget -q -O /dev/null http://localhost:${container.port}/${container.healthcheckPath.replace(/^\//, "")}`,
          ],
          interval: 30,
          timeout: 5,
          retries: 3,
          startPeriod: 60,
        },
      },
    ],
  };
}