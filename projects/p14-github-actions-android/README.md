# p14-github-actions-android

An original Android CI/CD pipeline demo. GitHub Actions is the delivery layer
for an Android app, so this project models exactly the pieces a real pipeline
depends on — reproducible semver + git-describe versioning, an offline lint of
the app model (no Android SDK needed) and a tag-gated release workflow that
signs APKs with secrets only.

Topic note: inspired by DevOps-Projects (project-14-github-actions-android,
MIT, DevCloudNinjas). The implementation here is original.

## What it does

- src/versioning.ts — semver parsing and deterministic bumping (major / minor
  / patch / rc / release), `versionCodeFrom` (semver core + candidate offset +
  commits since tag), and `buildInfo` that resolves a channel: a tag becomes a
  release, a `git describe` string becomes the next rc, otherwise a fallback.
- src/appmodel.ts — the Android app model (`dev.shamanchi.runnotes`) and an
  `AndroidManifest.xml` renderer with the resolved version.
- src/lint.ts — an offline Android lint: permission gaps (L01/L02), disabled
  release minification (L03), a low sdk floor (L04) and sdk inconsistency
  (L05). Runs on the bundled model without an Android SDK.
- src/pipeline.ts — renders `android-ci.yml`: validate → lint → test →
  assemble, with a release job gated to `v*` tags that decodes the keystore
  from `ANDROID_KEYSTORE_B64` and signs via env-injected passwords. Also
  renders `app/build.gradle.kts` with the computed version and signing notes.
- src/cli.ts — `--check` verifies lint cleanliness, version math and that the
  workflow only references secrets; `--version`, `--lint`, `--workflow` and
  `--notes` expose the pieces.

## Usage

Requirements: Node.js 24.

1. npm ci
2. npm run verify
3. npm run check

Resolve the version that CI would build for a tag or a describe string:

npm run cli -- --version --tag v1.2.3
npm run cli -- --version --describe v0.3.1-7-gdeadbeef

Render the CI workflow and the signing instructions:

npm run cli -- --workflow --out .github/workflows/android-ci.yml
npm run cli -- --notes

## Release flow

The pipeline never embeds credentials: the keystore lives in
`ANDROID_KEYSTORE_B64` and passwords in dedicated secrets, all referenced as
`${{ secrets.* }}`. A release only happens on a `v*` tag after lint, unit
tests and the debug build have passed.