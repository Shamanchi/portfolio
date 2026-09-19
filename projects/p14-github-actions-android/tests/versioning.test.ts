import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildInfo,
  formatVersion,
  nextVersion,
  parseVersion,
  versionCodeFrom,
} from "../src/versioning.ts";

test("parseVersion handles tags and rc suffixes", () => {
  assert.deepEqual(parseVersion("v1.2.3"), { major: 1, minor: 2, patch: 3, rc: undefined });
  assert.deepEqual(parseVersion("1.2.3-rc.2"), { major: 1, minor: 2, patch: 3, rc: 2 });
  assert.equal(parseVersion("not a version"), undefined);
});

test("nextVersion bumping is deterministic", () => {
  const v = parseVersion("1.2.3")!;
  assert.equal(formatVersion(nextVersion(v, "major")), "2.0.0");
  assert.equal(formatVersion(nextVersion(v, "minor")), "1.3.0");
  assert.equal(formatVersion(nextVersion(v, "patch")), "1.2.4");
  assert.equal(formatVersion(nextVersion(v, "rc")), "1.2.3-rc.1");
  assert.equal(formatVersion(nextVersion(nextVersion(v, "rc"), "rc")), "1.2.3-rc.2");
  assert.equal(formatVersion(nextVersion(nextVersion(v, "rc"), "release")), "1.2.3");
});

test("versionCode derives from the semver core", () => {
  assert.equal(versionCodeFrom(parseVersion("1.2.3")!, 0), 1020300);
  assert.equal(versionCodeFrom(parseVersion("1.2.3")!, 4), 1020304);
  assert.equal(versionCodeFrom(parseVersion("2.0.0")!, 1), 2000001);
});

test("buildInfo picks the tag for releases and an rc otherwise", () => {
  const release = buildInfo("v3.4.5", undefined, 0);
  assert.equal(release.channel, "release");
  assert.equal(release.versionName, "3.4.5");

  const describe = buildInfo("", "v1.2.3-12-abcd1234", 12);
  assert.equal(describe.channel, "candidate");
  assert.equal(describe.versionName, "1.2.3-rc.1");
  assert.equal(describe.versionCode, 1020322);

  const fallback = buildInfo("", undefined, 3);
  assert.equal(fallback.versionName, "0.0.1-rc.1");
});