export type GateLevel = "pass" | "warn" | "fail";

export interface QualityMetrics {
  coverage: number;
  criticalIssues: number;
  requiredCoverage: number;
  allowedCritical: number;
}

export interface GateResult {
  level: GateLevel;
  reasons: string[];
}

export function qualityGate(metrics: QualityMetrics): GateResult {
  const reasons: string[] = [];
  if (metrics.coverage < metrics.requiredCoverage) {
    reasons.push(`coverage ${metrics.coverage}% below ${metrics.requiredCoverage}%`);
  }
  if (metrics.criticalIssues > metrics.allowedCritical) {
    reasons.push(`${metrics.criticalIssues} critical issues (allowed ${metrics.allowedCritical})`);
  }
  if (reasons.length === 0) return { level: "pass", reasons: ["quality gate passed"] };
  if (metrics.criticalIssues === 0 || metrics.coverage >= metrics.requiredCoverage - 5) {
    return { level: "warn", reasons };
  }
  return { level: "fail", reasons };
}

export function dockerTag(branch: string, version: string, buildId: string, isTagPush: boolean): string[] {
  if (isTagPush) return [version];
  if (branch === "main") return [version];
  if (branch.startsWith("release/")) {
    const base = branch.slice("release/".length);
    return [`${base}-rc.${buildId}`, version];
  }
  return [`${sanitize(branch)}-${buildId}`];
}

function sanitize(branch: string): string {
  return branch.replace(/[^A-Za-z0-9]+/g, "-").slice(0, 24);
}