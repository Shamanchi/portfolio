import type { AppModel } from "./appmodel.ts";

export interface Finding {
  rule: string;
  severity: "warning" | "error";
  message: string;
}

export interface LintResult {
  findings: Finding[];
  ok: boolean;
}

const RELEASE_MIN_SDK = 23;

export function lintApp(app: AppModel): LintResult {
  const findings: Finding[] = [];

  if (app.usesNetwork && !app.permissions.includes("android.permission.INTERNET")) {
    findings.push({
      rule: "L01",
      severity: "error",
      message: "the app declares network usage but the INTERNET permission is missing",
    });
  }

  if (app.permissions.includes("android.permission.WRITE_EXTERNAL_STORAGE")) {
    findings.push({
      rule: "L02",
      severity: "warning",
      message: "WRITE_EXTERNAL_STORAGE is deprecated and ignored on Android 11+",
    });
  }

  if (!app.releaseMinify) {
    findings.push({
      rule: "L03",
      severity: "error",
      message: "the release build has minification disabled",
    });
  }

  if (app.minSdk < RELEASE_MIN_SDK) {
    findings.push({
      rule: "L04",
      severity: "warning",
      message: `minSdk ${app.minSdk} is below the ${RELEASE_MIN_SDK} release floor`,
    });
  }

  if (app.minSdk > app.targetSdk) {
    findings.push({
      rule: "L05",
      severity: "error",
      message: "minSdk must not exceed targetSdk",
    });
  }

  return { findings, ok: findings.every((finding) => finding.severity !== "error") };
}