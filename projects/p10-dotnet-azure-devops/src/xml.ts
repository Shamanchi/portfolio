export interface PackageReference {
  name: string;
  version?: string;
}

export function extractTargetFrameworks(xml: string): string[] {
  const out: string[] = [];
  for (const match of xml.matchAll(/<TargetFrameworks?\b[^>]*>(.*?)<\/TargetFrameworks?>/gi)) {
    const value = (match[1] ?? "").trim();
    if (value !== "") {
      out.push(
        ...value
          .split(/[;,\s]+/)
          .map((part) => part.trim())
          .filter((part) => part !== ""),
      );
    }
  }
  return out;
}

export function extractPackageReferences(xml: string): PackageReference[] {
  const out: PackageReference[] = [];
  for (const match of xml.matchAll(/<PackageReference\b[^>]*Include="([^"]+)"(?:\s+Version="([^"]+)")?\s*\/?>/gi)) {
    const name = match[1];
    if (name === undefined) continue;
    out.push({ name, version: match[2] });
  }
  return out;
}

function withoutNetPrefix(framework: string): string {
  return framework.replace(/^net(?=\d)/, "").replace(/^v(?=\d)/, "");
}

export interface CsprojCheck {
  ok: boolean;
  problems: string[];
  frameworks: string[];
  packageCount: number;
}

export function validateCsproj(xml: string, expectedFramework: string): CsprojCheck {
  const problems: string[] = [];
  const frameworks = extractTargetFrameworks(xml);
  if (frameworks.length === 0) {
    problems.push("no <TargetFramework> element found");
  } else {
    const normalized = frameworks.map(withoutNetPrefix);
    if (!normalized.includes(expectedFramework)) {
      problems.push(`expected framework ${expectedFramework}, found ${normalized.join(", ")}`);
    }
  }
  const packages = extractPackageReferences(xml);
  const seen = new Set<string>();
  for (const pkg of packages) {
    if (seen.has(pkg.name)) {
      problems.push(`duplicate PackageReference ${pkg.name}`);
    }
    seen.add(pkg.name);
  }
  return { ok: problems.length === 0, problems, frameworks, packageCount: packages.length };
}

export const SAMPLE_CSPROJ = `<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="9.0.0" />
    <PackageReference Include="Serilog.AspNetCore" Version="9.0.0" />
  </ItemGroup>
</Project>
`;