import type { AppModel } from "./appmodel.ts";
import type { BuildInfo } from "./versioning.ts";

export interface PipelinePlan {
  javaDistribution: string;
  javaVersion: string;
}

export const DEFAULT_PLAN: PipelinePlan = {
  javaDistribution: "temurin",
  javaVersion: "17",
};

export function renderWorkflow(plan: PipelinePlan): string {
  return `name: android-ci

on:
  push:
    branches: [main]
    tags: ['v*']
  pull_request:

permissions:
  contents: read

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: ${plan.javaDistribution}
          java-version: '${plan.javaVersion}'
      - uses: gradle/actions/setup-gradle@v4
      - run: ./gradlew --version

  lint:
    needs: validate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: ${plan.javaDistribution}
          java-version: '${plan.javaVersion}'
      - uses: gradle/actions/setup-gradle@v4
      - run: ./gradlew lintDebug

  test:
    needs: lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: ${plan.javaDistribution}
          java-version: '${plan.javaVersion}'
      - uses: gradle/actions/setup-gradle@v4
      - run: ./gradlew testDebugUnitTest

  assemble:
    needs: [lint, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: ${plan.javaDistribution}
          java-version: '${plan.javaVersion}'
      - uses: gradle/actions/setup-gradle@v4
      - run: ./gradlew assembleDebug
      - uses: actions/upload-artifact@v4
        with:
          name: debug-apk
          path: app/build/outputs/apk/debug/app-debug.apk

  release:
    needs: assemble
    runs-on: ubuntu-latest
    if: startsWith(github.ref, 'refs/tags/v')
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: ${plan.javaDistribution}
          java-version: '${plan.javaVersion}'
      - uses: gradle/actions/setup-gradle@v4
      - name: decode signing keystore
        run: |
          echo "$RELEASE_KEYSTORE" | base64 -d > keystore-release.jks
        env:
          RELEASE_KEYSTORE: \${{ secrets.ANDROID_KEYSTORE_B64 }}
      - name: assemble and sign release
        run: ./gradlew assembleRelease
        env:
          KEYSTORE_PASSWORD: \${{ secrets.KEYSTORE_PASSWORD }}
          KEY_ALIAS: \${{ secrets.KEYSTORE_KEY_ALIAS }}
          KEY_PASSWORD: \${{ secrets.KEYSTORE_KEY_PASSWORD }}
      - uses: actions/upload-artifact@v4
        with:
          name: release-apk
          path: app/build/outputs/apk/release/app-release.apk
`;
}

export function renderSigningNotes(plan: PipelinePlan): string {
  return `# Android release signing

The Android CI never reads a keystore from the repository. The release job on a
v* tag decodes the base64 keystore from the ANDROID_KEYSTORE_B64 secret, then
passes KEYSTORE_PASSWORD, KEYSTORE_KEY_ALIAS and KEYSTORE_KEY_PASSWORD to the
Gradle build over the environment.

1. Store the keystore once: base64 -w0 keystore-release.jks (macOS) or
   certutil -encode (Windows), then add it as a GitHub Actions secret.
2. Push a tag: git tag v1.2.3 && git push origin v1.2.3
3. The release job also renders app/build.gradle.kts with the versionName and
   versionCode computed for that tag (see --version and --workflow).
`;
}

export function renderBuildGradleKts(app: AppModel, info: BuildInfo): string {
  return `android {
    namespace = "${app.applicationId}"
    compileSdk = ${app.compileSdk}

    defaultConfig {
        minSdk = ${app.minSdk}
        targetSdk = ${app.targetSdk}
        versionCode = ${info.versionCode}
        versionName = "${info.versionName}"
    }

    buildTypes {
        release {
            isMinifyEnabled = ${app.releaseMinify ? "true" : "false"}
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"))
        }
    }
}
`;
}