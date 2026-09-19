export interface SemVer {
  major: number;
  minor: number;
  patch: number;
  rc?: number;
}

export type VersionBump = "major" | "minor" | "patch" | "rc" | "release";

export function parseVersion(input: string): SemVer | undefined {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-rc\.(\d+))?$/.exec(input.trim());
  if (match === null) return undefined;
  const rc = match[4] === undefined ? undefined : Number(match[4]);
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]), rc };
}

export function formatVersion(version: SemVer): string {
  const core = `${version.major}.${version.minor}.${version.patch}`;
  return version.rc === undefined ? core : `${core}-rc.${version.rc}`;
}

export function nextVersion(current: SemVer, bump: VersionBump): SemVer {
  switch (bump) {
    case "major":
      return { major: current.major + 1, minor: 0, patch: 0 };
    case "minor":
      return { major: current.major, minor: current.minor + 1, patch: 0 };
    case "patch":
      return { major: current.major, minor: current.minor, patch: current.patch + 1 };
    case "release":
      return { major: current.major, minor: current.minor, patch: current.patch };
    case "rc": {
      const base =
        current.rc === undefined
          ? { major: current.major, minor: current.minor, patch: current.patch }
          : current;
      return { ...base, rc: (base.rc ?? 0) + 1 };
    }
  }
}

export function versionCodeFrom(version: SemVer, commitsSinceTag: number): number {
  const core = version.major * 10000 + version.minor * 100 + version.patch;
  const offset = version.rc !== undefined ? version.rc * 10 : 0;
  return core * 100 + offset + Math.max(0, Math.min(commitsSinceTag, 99));
}

export interface BuildInfo {
  versionName: string;
  versionCode: number;
  channel: "release" | "candidate";
}

export function buildInfo(ref: string, describe: string | undefined, commitsSinceTag: number): BuildInfo {
  const tagged = parseVersion(ref);
  if (tagged !== undefined) {
    return { versionName: formatVersion(tagged), versionCode: versionCodeFrom(tagged, 0), channel: "release" };
  }
  if (describe !== undefined) {
    const base = parseVersion(describe.split("-")[0] ?? "0.0.0");
    if (base !== undefined && describe.includes("-")) {
      const candidate = nextVersion(base, "rc");
      return { versionName: formatVersion(candidate), versionCode: versionCodeFrom(candidate, commitsSinceTag), channel: "candidate" };
    }
  }
  const fallback = { major: 0, minor: 0, patch: 1, rc: 1 };
  return { versionName: formatVersion(fallback), versionCode: versionCodeFrom(fallback, commitsSinceTag), channel: "candidate" };
}