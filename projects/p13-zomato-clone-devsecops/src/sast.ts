export interface SaRule {
  id: string;
  description: string;
  pattern: RegExp;
}

export interface Finding {
  rule: string;
  line: number;
  evidence: string;
}

export const SA_RULES: SaRule[] = [
  { id: "S01", description: "dynamic code execution", pattern: /\b(eval|new Function|Function)\s*\(/g },
  { id: "S02", description: "shell or process execution", pattern: /\b(child_process|spawn|execSync|exec)\s*\(/g },
  {
    id: "S03",
    description: "hard-coded credential value in source",
    pattern: /\b(api[_-]?)?(key|secret|token|credential)\b\s*[=:]\s*["'][A-Za-z0-9]{12,}["']/gi,
  },
  { id: "S04", description: "plain-text password field", pattern: /\bpassword\s*[=:]\s*["'][^"']+["']/gi },
  { id: "S05", description: "referenced environment file", pattern: /\b\.env(?:\.[a-z0-9]+)?\s*["']/gi },
];

export function scanText(text: string): Finding[] {
  const findings: Finding[] = [];
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    for (const rule of SA_RULES) {
      const match = rule.pattern.exec(line);
      if (match !== null) {
        findings.push({
          rule: rule.id,
          line: index + 1,
          evidence: match[0].slice(0, 80),
        });
      }
      rule.pattern.lastIndex = 0;
    }
  }
  return findings;
}