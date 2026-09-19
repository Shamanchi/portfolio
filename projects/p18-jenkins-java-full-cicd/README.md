# p18-jenkins-java-full-cicd

An original full CI/CD demo for a Java service with Jenkins: a Maven pipeline
that compiles, unit-tests, static-analyses and packages a JAR, then builds and
pushes Docker images under a deterministic tagging policy, gated by an offline
quality engine (coverage + critical issues).

Topic note: inspired by DevOps-Projects (project-18-jenkins-java-full-cicd,
MIT, DevCloudNinjas). The implementation here is original.

## What it does

- src/model.ts — the pipeline model (Maven/JDK versions, artifact version,
  registry host, SonarQube URL) with validation.
- src/gates.ts — the quality gate engine: given coverage and critical issues
  it returns pass / warn / fail, plus a docker tag policy (v* tags → stable,
  release/* → version-rc.<build>, features → hashed names).
- src/jenkins.ts — renders a declarative Jenkinsfile running inside the Maven
  image: checkout, compile, unit tests (JUnit + JaCoCo), spotbugs, package and
  archive, Docker build + push through `harbor-pusher` credentials, a manual
  `Quality approval` input and a Helm deploy.
- src/cli.ts — `--check` validates the model, renders the pipeline and runs
  the gate and tag rules; `--pipeline`, `--gate`, `--tags` and `--notes` expose
  each piece.

## Usage

Requirements: Node.js 24.

1. npm ci
2. npm run verify
3. npm run check

Render the Jenkinsfile and the delivery notes:

npm run cli -- --pipeline --out Jenkinsfile
npm run cli -- --notes

Ask the gate and the tag policy:

npm run cli -- --gate --coverage 91 --critical 0
npm run cli -- --tags --branch release/1.5 --build 88

## Policy

- Only `main`, `release/*` and tags push images; feature branches build but
  stay out of the registry.
- Credentials are Jenkins credential ids (`harbor-pusher`), never values.
- The gate is exercised offline by `src/gates.ts`, so CI results are
  reproducible without Maven.