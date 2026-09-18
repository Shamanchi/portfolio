export interface DotnetModel {
  solutionPath: string;
  projectPath: string;
  testProjectPath: string;
  framework: string;
  environments: string[];
  appServiceName: string;
  mainBranch: string;
}

export function validateModel(model: DotnetModel): string[] {
  const problems: string[] = [];
  if (model.solutionPath.trim() === "") problems.push("solutionPath is required");
  if (model.projectPath.trim() === "") problems.push("projectPath is required");
  if (model.testProjectPath.trim() === "") problems.push("testProjectPath is required");
  if (!/^\d+\.\d+$/.test(model.framework)) {
    problems.push(`framework must look like "8.0" or "9.0", got "${model.framework}"`);
  }
  if (model.environments.length === 0) {
    problems.push("at least one environment is required");
  }
  const unique = new Set(model.environments);
  if (unique.size !== model.environments.length) {
    problems.push("environments must be unique");
  }
  if (model.appServiceName.trim() === "") problems.push("appServiceName is required");
  if (model.mainBranch.trim() === "") problems.push("mainBranch is required");
  return problems;
}

export function defaultModel(): DotnetModel {
  return {
    solutionPath: "src/WatchApi.sln",
    projectPath: "src/WatchApi/WatchApi.csproj",
    testProjectPath: "tests/WatchApi.Tests/WatchApi.Tests.csproj",
    framework: "9.0",
    environments: ["production"],
    appServiceName: "watch-api-app",
    mainBranch: "main",
  };
}