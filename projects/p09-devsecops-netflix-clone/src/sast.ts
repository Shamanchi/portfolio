import { readFile } from "node:fs/promises";
import { glob } from "node:fs/promises";
import { join, relative, normalize } from "node:path";

export interface Finding {
  file: string;
  line: number;
  rule: string;
  evidence: string;
}

export interface SastRule {
  id: string;
  description: string;
  pattern: RegExp;
}

export const SAST_RULES: SastRule[] = [
  {
    id: "R01",
    description: "dynamic code execution (eval, new Function)",
    pattern: /\b(eval|new Function)\s*\(/g,
  },
  {
    id: "R02",
    description: "shell command execution through child_process",
    pattern: /\b(child_process)?\.?\s*(exec|spawn|execFile)\(/g,
  },
  {
    id: "R03",
    description: "hard-coded api token pattern in source",
    pattern: /\b(api[_-]?)?(key|secret|token)\b\s*[=:]\s*["'][A-Za-z0-9]{12,}["']/gi,
  },
  {
    id: "R04",
    description: "plain-text password in source",
    pattern: /\bpassword\s*[=:]\s*["'][^"'\s]{1,}["']/gi,
  },
];

export function scanText(text: string): Finding[] {
  const findings: Finding[] = [];
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index] ?? "";
    for (const rule of SAST_RULES) {
      const matches = [...line.matchAll(rule.pattern)];
      for (const match of matches) {
        findings.push({
          file: "<memory>",
          line: index + 1,
          rule: rule.id,
          evidence: match[0],
        });
      }
    }
  }
  return findings;
}

export async function scanDirectory(
  root: string,
  include: ReadonlyArray<string>,
): Promise<{ findings: Finding[]; filesChecked: number }> {
  const findings: Finding[] = [];
  let filesChecked = 0;
  for (const pattern of include) {
    for await (const entry of glob(pattern, { cwd: root })) {
      const path = join(root, entry);
      const text = await readFile(path, "utf8");
      filesChecked += 1;
      const lines = text.split(/\r?\n/);
      for (let index = 0; index < lines.length; index++) {
        const line = lines[index] ?? "";
        for (const rule of SAST_RULES) {
          const matches = [...line.matchAll(rule.pattern)];
          for (const match of matches) {
            findings.push({
              file: relative(root, normalize(path)),
              line: index + 1,
              rule: rule.id,
              evidence: match[0],
            });
          }
        }
      }
    }
  }
  return { findings, filesChecked };
}