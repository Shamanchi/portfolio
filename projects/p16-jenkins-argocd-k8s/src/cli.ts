import { parseArgs } from "node:util";
import { writeFileSync } from "node:fs";
import { validateConfig, DEFAULT_ARGO, DEFAULT_JENKINS } from "./config.ts";
import { renderApplication, renderArgoCli } from "./argocd.ts";
import { renderJenkinsfile, renderCredentialNotes } from "./ci.ts";
import { syncDecision, describeSyncChain } from "./gitops.ts";

const { values } = parseArgs({
  options: {
    check: { type: "boolean", short: "c" },
    app: { type: "boolean", short: "a" },
    jenkins: { type: "boolean", short: "j" },
    drift: { type: "boolean", short: "d" },
    notes: { type: "boolean", short: "n" },
    desired: { type: "string" },
    live: { type: "string" },
    out: { type: "string", short: "o" },
  },
});

function writeOrPrint(filename: string | undefined, content: string): void {
  if (filename) {
    writeFileSync(filename, content, "utf8");
    console.log(`wrote ${filename}`);
  } else {
    process.stdout.write(content);
  }
}

function runCheck(): void {
  const problems: string[] = [];
  const expect = (label: string, actual: unknown, wanted: unknown) => {
    if (actual !== wanted) problems.push(`${label}: expected ${wanted}, got ${actual}`);
  };

  expect("default config valid", validateConfig(DEFAULT_ARGO, DEFAULT_JENKINS).length, 0);

  const app = renderApplication(DEFAULT_ARGO);
  for (const fragment of ["kind: Application", "repoURL: https://github.com/Shamanchi/shop-gitops", "PruneLast=true"]) {
    if (!app.includes(fragment)) problems.push(`application is missing ${fragment}`);
  }

  const pipeline = renderJenkinsfile(DEFAULT_JENKINS, DEFAULT_ARGO);
  for (const fragment of ["stage('Update gitops repo')", "yq eval", "git push", DEFAULT_JENKINS.registryCredentialId]) {
    if (!pipeline.includes(fragment)) problems.push(`jenkinsfile is missing ${fragment}`);
  }

  const inSync = syncDecision({ desiredTag: "1.4.2", liveTag: "1.4.2", desiredNamespace: "prod", liveNamespace: "prod" });
  expect("no drift -> noop", inSync.action, "noop");
  const drifted = syncDecision({ desiredTag: "1.5.0", liveTag: "1.4.2", desiredNamespace: "prod", liveNamespace: "prod" });
  expect("tag drift -> sync", drifted.action, "sync");
  const blocked = syncDecision({ desiredTag: "1.5.0", liveTag: "1.4.2", desiredNamespace: "prod", liveNamespace: "staging" });
  expect("namespace drift -> blocked", blocked.action, "blocked");

  if (/AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{20,}/.test(pipeline + app)) {
    problems.push("rendered pipeline or application carries a credential-shaped string");
  }

  if (problems.length === 0) {
    console.log("gitops: PASS (argocd app, jenkins pipeline, sync drift)");
  } else {
    for (const problem of problems) {
      console.error(`gitops: ${problem}`);
    }
    process.exitCode = 1;
  }
}

if (values.check) {
  runCheck();
} else if (values.app) {
  writeOrPrint(values.out, renderApplication(DEFAULT_ARGO) + "\n" + renderArgoCli(DEFAULT_ARGO));
} else if (values.jenkins) {
  writeOrPrint(values.out, renderJenkinsfile(DEFAULT_JENKINS, DEFAULT_ARGO));
} else if (values.drift) {
  const desired = values.desired ?? "1.5.0";
  const live = values.live ?? "1.4.2";
  const decision = syncDecision({ desiredTag: desired, liveTag: live, desiredNamespace: "prod", liveNamespace: "prod" });
  writeOrPrint(values.out, `desired ${desired} vs live ${live}\naction: ${decision.action} (${decision.reason})\n${describeSyncChain(true)}\n`);
} else if (values.notes) {
  writeOrPrint(values.out, renderCredentialNotes(DEFAULT_JENKINS));
} else {
  runCheck();
}