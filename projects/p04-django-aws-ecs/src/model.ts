export interface ContainerConfig {
  image: string;
  cpuUnit: number;
  memoryMiB: number;
  port: number;
  healthcheckPath: string;
  environment: Record<string, string>;
  secrets: string[];
}

export interface DjangoApp {
  appName: string;
  region: string;
  clusterName: string;
  domain: string;
  imageTag: string;
  container: ContainerConfig;
  desiredCount: number;
  minCapacity: number;
  maxCapacity: number;
  cpuTargetPercent: number;
}

export const FARGATE_CPU_MEMORY: ReadonlyArray<Readonly<[number, ReadonlyArray<number>]>> = [
  [256, [512, 1024, 2048]],
  [512, [1024, 2048, 3072, 4096]],
  [1024, [2048, 3072, 4096, 5120, 6144, 7168, 8192]],
  [2048, [4096, 5120, 6144, 7168, 8192, 9216, 10240, 11264, 12288, 13312, 14336, 15360, 16384]],
];

export function defaultApp(): DjangoApp {
  return {
    appName: "django-ecs",
    region: "eu-central-1",
    clusterName: "django-ecs-cluster",
    domain: "app.example.com",
    imageTag: "latest",
    container: {
      image: "public.ecr.aws/docker/library/django:4.2-alpine",
      cpuUnit: 512,
      memoryMiB: 1024,
      port: 8000,
      healthcheckPath: "/healthz/",
      environment: {
        DJANGO_SETTINGS_MODULE: "config.settings.production",
        ALLOWED_HOSTS: "app.example.com",
      },
      secrets: ["/django/app/DJANGO_SECRET_KEY", "/django/app/DB_PASSWORD"],
    },
    desiredCount: 2,
    minCapacity: 2,
    maxCapacity: 6,
    cpuTargetPercent: 60,
  };
}

export function isFargateCpuMemory(cpuUnit: number, memoryMiB: number): boolean {
  for (const [cpu, memories] of FARGATE_CPU_MEMORY) {
    if (cpu === cpuUnit) {
      return memories.includes(memoryMiB);
    }
  }
  return false;
}

export function validate(honestApp: DjangoApp): string[] {
  const problems: string[] = [];
  if (!honestApp.appName.match(/^[a-z0-9][a-z0-9-]{1,62}$/)) {
    problems.push("appName must match ^[a-z0-9][a-z0-9-]{1,62}$");
  }
  if (!honestApp.region) {
    problems.push("region must not be empty");
  }
  if (!honestApp.domain) {
    problems.push("domain must not be empty");
  }
  if (!honestApp.imageTag) {
    problems.push("imageTag must not be empty");
  }
  if (!isFargateCpuMemory(honestApp.container.cpuUnit, honestApp.container.memoryMiB)) {
    problems.push(
      `cpu/memory ${honestApp.container.cpuUnit}/${honestApp.container.memoryMiB} is not a valid Fargate pair`,
    );
  }
  if (!honestApp.container.healthcheckPath.startsWith("/")) {
    problems.push("healthcheckPath must start with a slash");
  }
  if (honestApp.desiredCount < 1) {
    problems.push("desiredCount must be at least 1");
  }
  if (honestApp.minCapacity < 1 || honestApp.maxCapacity < honestApp.minCapacity) {
    problems.push("autoscaling capacity range is invalid");
  }
  if (honestApp.cpuTargetPercent < 10 || honestApp.cpuTargetPercent > 90) {
    problems.push("cpuTargetPercent must be between 10 and 90");
  }
  const secretNames = honestApp.container.secrets.map(stripPrefix);
  for (const envName of Object.keys(honestApp.container.environment)) {
    if (!envName.match(/^[A-Z][A-Z0-9_]*$/)) {
      problems.push(`environment key ${envName} must be UPPER_CASE`);
    }
    if (secretNames.includes(envName)) {
      problems.push(`key ${envName} must not appear both in environment and secrets`);
    }
  }
  return problems;
}

function stripPrefix(arnOrPath: string): string {
  const collected = arnOrPath.split("/");
  return collected[collected.length - 1] ?? arnOrPath;
}