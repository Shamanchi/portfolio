// Scanner without external services: private keys, tokens, keys and .env files.
// Run: node scripts/scan-secrets.mjs

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  ".swarm",
  "dist",
  "build",
  "coverage",
  ".next",
]);

// Additional relative paths to skip when matched verbatim.
const SKIP_PATHS = new Set([
  "scripts/scan-secrets.mjs",
  "scripts/quality-gate.mjs",
]);

const MAX_FILE_BYTES = 2 * 1024 * 1024;

function isProbablyBinary(buffer) {
  const probe = buffer.subarray(0, 2048);
  for (const byte of probe) {
    if (byte === 0) return true;
  }
  return false;
}

function walk(dir, output) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(abs, output);
      continue;
    }
    output.push(abs);
  }
}

const PATTERNS = [
  { id: "private-key", label: "private key block", re: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/ },
  { id: "aws-access-key", label: "AWS access key id", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { id: "aws-secret-key", label: "AWS secret access key", re: /\b(?:aws_secret_access_key|AWS_SECRET_ACCESS_KEY)\s*=\s*[A-Za-z0-9+/=]{20,}/ },
  { id: "github-token", label: "GitHub token", re: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/ },
  { id: "openai-key", label: "OpenAI-style key", re: /\bsk-[A-Za-z0-9]{20,}\b/ },
  { id: "slack-token", label: "Slack token", re: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/ },
  { id: "stripe-key", label: "Stripe key", re: /\b(?:sk|pk)_live_[A-Za-z0-9]{20,}\b/ },
  { id: "google-api-key", label: "Google API key", re: /\bAIza[0-9A-Za-z_-]{20,}\b/ },
];

// Internal machine paths are not allowed in committed files.
const INTERNAL_PATH_RE = /\b[A-Za-z]:[\\/]+Users[\\/]/;

function scanFile(abs) {
  const rel = relative(root, abs).split(sep).join("/");
  if (SKIP_PATHS.has(rel)) return [];

  const stat = statSync(abs);
  if (stat.size === 0 || stat.size > MAX_FILE_BYTES) return [];

  const base = abs.split(/[\\/]/).pop() ?? "";
  const findings = [];

  if (base === ".env") {
    findings.push(`${rel}:1: .env file must not be committed`);
    return findings;
  }

  const buffer = readFileSync(abs);
  if (isProbablyBinary(buffer)) return [];

  const content = buffer.toString("utf8");
  const lines = content.split(/\r?\n/);

  for (const { id, label, re } of PATTERNS) {
    for (let i = 0; i < lines.length; i += 1) {
      if (re.test(lines[i])) {
        findings.push(`${rel}:${i + 1}: possible ${label}`);
      }
    }
  }

  if (INTERNAL_PATH_RE.test(content)) {
    findings.push(`${rel}: content contains an internal machine path under a user profile`);
  }

  return findings;
}

const all = [];
walk(root, all);

const problems = [];
for (const abs of all) {
  problems.push(...scanFile(abs));
}

if (problems.length === 0) {
  console.log(`secrets scan: ok (${all.length} files checked)`);
  process.exit(0);
}

for (const problem of problems) {
  console.error(`secrets scan: ${problem}`);
}
console.error(`secrets scan: FAILED, ${problems.length} finding(s)`);
process.exit(1);