import type { JenkinsConfig } from "./config.ts";
import type { ArgoConfig } from "./config.ts";

export function renderJenkinsfile(jenkins: JenkinsConfig, argocd: ArgoConfig): string {
  return `pipeline {
    agent any
    options { disableConcurrentBuilds() }

    parameters {
        string(name: 'IMAGE_TAG', defaultValue: 'latest', description: 'Image tag to deliver')
    }

    triggers {
        pollSCM('${jenkins.cron}')
    }

    environment {
        IMAGE = '${jenkins.imageRepo}'
        TAG = "${'$'}{params.IMAGE_TAG}"
        REGISTRY_CRED = credentials('${jenkins.registryCredentialId}')
    }

    stages {
        stage('Build image') {
            steps { sh 'docker build -t "${'$'}{IMAGE}:${'$'}{TAG}" .' }
        }
        stage('Push image') {
            steps { sh 'echo "${'$'}{REGISTRY_CRED}" | docker login ghcr.io --username-stdin' }
        }
        stage('Update gitops repo') {
            steps {
                dir('shop-gitops') {
                    sh 'yq eval \'.image.tag = "${'$'}{TAG}"\' -i ${'$'}{ENV_GITOPS_VALUES}'
                    sh 'git commit -am "ship ${'$'}{TAG}" && git push'
                }
            }
        }
    }
}

// ArgoCD watches ${argocd.sourceRepo} at ${argocd.sourcePath};
// the push above flips the desired tag and auto-sync reconciles the cluster.
`;
}

export function renderCredentialNotes(jenkins: JenkinsConfig): string {
  return `# Credential contract

The pipeline never embeds a token. ${jenkins.registryCredentialId} is a Jenkins
credential id; the values themselves live in the Jenkins credential store.
Jenkins passes the secret over REGISTRY_CRED and the built image is pushed
only when the merge to ${jenkins.branch} triggered this ${jenkins.jobName} job.
`;
}