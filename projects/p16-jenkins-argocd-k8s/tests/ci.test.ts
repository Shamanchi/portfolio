import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { DEFAULT_ARGO, DEFAULT_JENKINS } from "../src/config.ts";
import { renderApplication, renderArgoCli } from "../src/argocd.ts";
import { renderJenkinsfile, renderCredentialNotes } from "../src/ci.ts";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

test("the ArgoCD application is a valid, automated manifest", () => {
  const app = renderApplication(DEFAULT_ARGO);
  assert.match(app, /kind: Application/);
  assert.match(app, /repoURL: https:\/\/github\.com\/Shamanchi\/shop-gitops/);
  assert.match(app, /path: environments\/prod/);
  assert.match(app, /prune: true/);
  assert.match(app, /selfHeal: true/);
  assert.match(app, /PruneLast=true/);
  assert.equal(renderApplication(DEFAULT_ARGO), app);
});

test("the ArgoCD CLI cheat sheet covers get and sync", () => {
  const sheet = renderArgoCli(DEFAULT_ARGO);
  assert.match(sheet, /argocd app get shop-api/);
  assert.match(sheet, /argocd app sync/);
  assert.match(sheet, /PruneLast/);
});

test("the Jenkinsfile updates the gitops repo and never carries a token", () => {
  const pipeline = renderJenkinsfile(DEFAULT_JENKINS, DEFAULT_ARGO);
  assert.match(pipeline, /stage\('Build image'\)/);
  assert.match(pipeline, /stage\('Update gitops repo'\)/);
  assert.match(pipeline, /yq eval/);
  assert.match(pipeline, /git push/);
  assert.match(pipeline, /credentials\('ghcr-push'\)/);
  assert.doesNotMatch(pipeline, /ghp_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}/);
});

test("the credential notes explain the contract", () => {
  const notes = renderCredentialNotes(DEFAULT_JENKINS);
  assert.match(notes, /ghcr-push/);
  assert.match(notes, /credential store/);
});

test("check CLI reports gitops PASS", () => {
  const stdout = execFileSync(process.execPath, [join(projectRoot, "src", "cli.ts"), "--check"], {
    encoding: "utf8",
  });
  assert.match(stdout, /gitops: PASS/);
});

test("drift CLI prints the sync decision", () => {
  const stdout = execFileSync(
    process.execPath,
    [join(projectRoot, "src", "cli.ts"), "--drift", "--desired", "2.0.0", "--live", "1.9.9"],
    { encoding: "utf8" },
  );
  assert.match(stdout, /action: sync/);
});