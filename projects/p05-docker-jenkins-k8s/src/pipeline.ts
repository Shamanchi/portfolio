export type StageName = "build" | "push" | "deploy" | "rollout";

export interface PipelineConfig {
  name: string;
  registryImage: string;
  clusterName: string;
  namespace: string;
  appPath: string;
}

export const RELEASE_TAG_PARAM = "IMAGE_TAG";

export function defaultPipeline(): PipelineConfig {
  return {
    name: "catalog",
    registryImage: "registry.example.com/portfolio/catalog",
    clusterName: "eks-demo",
    namespace: "apps",
    appPath: ".",
  };
}

export function validate(pipeline: PipelineConfig): string[] {
  const problems: string[] = [];
  if (!pipeline.name.match(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/)) {
    problems.push("name must be a lowercase DNS label");
  }
  if (!pipeline.registryImage.match(/^[\w.\/-]+$/)) {
    problems.push("registryImage contains invalid characters");
  }
  if (!pipeline.clusterName.trim()) {
    problems.push("clusterName must not be empty");
  }
  if (!pipeline.namespace.match(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/)) {
    problems.push("namespace must be a lowercase DNS label");
  }
  if (!pipeline.appPath) {
    problems.push("appPath must not be empty");
  }
  return problems;
}

export function stageSequence(): StageName[] {
  return ["build", "push", "deploy", "rollout"];
}

export function renderJenkinsfile(pipeline: PipelineConfig): string {
  const image = `${pipeline.registryImage}:\${${RELEASE_TAG_PARAM}}`;
  return `pipeline {
  agent any
  environment {
    REGISTRY_IMAGE = "${pipeline.registryImage}"
    CLUSTER = "${pipeline.clusterName}"
    NAMESPACE = "${pipeline.namespace}"
  }
  parameters {
    string(name: "${RELEASE_TAG_PARAM}", defaultValue: "latest", description: "Release tag to build, push and deploy")
    string(name: "REGISTRY_CREDENTIALS_ID", defaultValue: "registry-credentials", description: "Jenkins credential id for the container registry")
  }
  stages {
    stage('build') {
      steps {
        sh "docker build -t \${REGISTRY_IMAGE}:\${params.${RELEASE_TAG_PARAM}} ${pipeline.appPath}"
      }
    }
    stage('push') {
      steps {
        withCredentials([usernamePassword(credentialsId: "\${params.REGISTRY_CREDENTIALS_ID}", usernameVariable: 'REG_USER', passwordVariable: 'REG_PASS')]) {
          sh 'echo "\$REG_PASS" | docker login --username "\$REG_USER" --password-stdin "\${REGISTRY_IMAGE%.*}"'
          sh "docker push \${REGISTRY_IMAGE}:\${params.${RELEASE_TAG_PARAM}}"
        }
      }
    }
    stage('deploy') {
      steps {
        sh "kubectl --context \${CLUSTER} -n \${NAMESPACE} set image deployment/${pipeline.name} ${pipeline.name}=\${REGISTRY_IMAGE}:\${params.${RELEASE_TAG_PARAM}}"
        sh "kubectl --context \${CLUSTER} -n \${NAMESPACE} rollout restart deployment/${pipeline.name} || true"
      }
    }
    stage('rollout') {
      steps {
        timeout(time: 5, unit: 'MINUTES') {
          sh "kubectl --context \${CLUSTER} -n \${NAMESPACE} rollout status deployment/${pipeline.name} --timeout=4m"
        }
      }
    }
  }
}
`;
}

export function renderArtifactNotes(pipeline: PipelineConfig): string {
  const image = `${pipeline.registryImage}:<IMAGE_TAG>`;
  return [
    `# Release cheat sheet for ${pipeline.name}`,
    ``,
    `1. Trigger the Jenkins job (optionally pass IMAGE_TAG).`,
    `2. The pipeline builds ${image}, pushes it, then points the`,
    `   ${pipeline.namespace}/${pipeline.name} Deployment at the new image.`,
    `3. rollout status waits until the new ReplicaSet is healthy.`,
  ].join("\n");
}