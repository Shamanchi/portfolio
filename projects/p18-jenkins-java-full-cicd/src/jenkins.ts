import type { JavaPipelineConfig } from "./model.ts";

export function renderJenkinsfile(config: JavaPipelineConfig): string {
  const registry = `${config.registryHost}/${config.appName}`;
  return `pipeline {
    agent {
        docker {
            image 'maven:${config.mavenVersion}-eclipse-temurin-${config.jdkVersion}'
            args '-v /var/run/docker.sock:/var/run/docker.sock'
        }
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    parameters {
        string(name: 'BUILD_ID_LABEL', defaultValue: '', description: 'Optional build label')
        booleanParam(name: 'RUN_STATIC_ANALYSIS', defaultValue: true)
    }

    environment {
        REGISTRY = '${registry}'
        VERSION = '${config.artifactVersion}'
        REPO = '${config.repoUrl}'
        SONAR = '${config.sonarQubeUrl}'
        REGISTRY_CRED = credentials('harbor-pusher')
    }

    stages {
        stage('Checkout') {
            steps { checkout scm }
        }
        stage('Compile') {
            steps { sh 'mvn -B compile' }
        }
        stage('Unit tests') {
            steps {
                sh 'mvn -B test'
                junit 'target/surefire-reports/*.xml'
                jacoco(execPattern: 'target/jacoco.exec', sourcePattern: 'src/main/java', classPattern: 'target/classes')
            }
        }
        stage('Static analysis') {
            when { expression { params.RUN_STATIC_ANALYSIS } }
            steps { sh 'mvn -B spotbugs:check' }
        }
        stage('Package') {
            steps {
                sh 'mvn -B -DskipTests package'
                archiveArtifacts artifacts: 'target/*.jar', fingerprint: true
            }
        }
        stage('Docker build and push') {
            when {
                anyOf { branch 'main'; branch 'release/*'; buildingTag() }
            }
            steps {
                script {
                    def tags = dockerTags(env.BRANCH_NAME, '${config.artifactVersion}', env.BUILD_ID)
                    tags.each { tag ->
                        sh "docker build -t \${'$'}{REGISTRY}:\${'$'}{tag} -f Dockerfile ."
                    }
                    withCredentials([usernamePassword(credentialsId: 'harbor-pusher', usernameVariable: 'HARBOR_USER', passwordVariable: 'HARBOR_PASS')]) {
                        sh "docker login ${config.registryHost} -u ${'$'}{HARBOR_USER} -p ${'$'}{HARBOR_PASS}"
                    }
                    tags.each { tag ->
                        sh "docker push \${'$'}{REGISTRY}:\${'$'}{tag}"
                    }
                }
            }
        }
        stage('Quality approval') {
            input { message 'Promote to delivery?' ok 'Approve' }
        }
        stage('Deploy') {
            steps {
                sh "helm upgrade --install ${config.appName} chart/ --namespace ${config.appName} --set image.tag=\${'$'}{VERSION}"
            }
        }
    }

    post {
        success { echo "delivered ${registry}:${'$'}{VERSION}" }
        always {
            junit 'target/surefire-reports/*.xml'
            archiveArtifacts artifacts: 'target/**/*.jar', allowEmptyArchive: true
        }
    }
}

def dockerTags(String branch, String version, String buildId) {
    if (env.TAG_NAME != null) return [version]
    if (branch == '${config.branchDelivery}') return [version]
    if (branch.startsWith('release/')) {
        def base = branch - 'release/'
        return [base + '-rc.' + buildId, version]
    }
    return [(branch - ~/[^A-Za-z0-9]+/).take(24) + '-' + buildId]
}

// SonarQube integration point (${config.sonarQubeUrl}) left to a shared library;
// the gate above is evaluated by src/gates.ts in CI so the pipeline stays thin.
`;
}

export function renderPipelineNotes(config: JavaPipelineConfig): string {
  return `# Delivery notes for ${config.appName} (${config.branchDelivery} branch)

- The ${config.mavenVersion} Maven image with Temurin ${config.jdkVersion} runs
  every stage; no JDK state is shared between builds.
- Unit, integration coverage and a zero-critical-issue gate are evaluated out of
  band by src/gates.ts; a warn result still allows a feature build, only
  ${config.branchDelivery} and release branches push to ${config.registryHost}.
- Tags: v* tags → the version, release/* → version-rc.<build>, features → hashed.
`;
}