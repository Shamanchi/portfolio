# Contributing

## What this repository is

A public portfolio of Pavel Yrevich (Shamanchi). Every project here is an
original implementation. Third-party repositories are used only as sources of
topics and directions; their text, code, diagrams and images are not copied.
See NOTICE.md for the complete attribution policy.

## Ground rules

- Quality gate must stay green: npm run gate.
- No secrets, tokens, .env files or personal data in any commit.
- No internal machine paths (any absolute path under the local user profile)
  in committed files.
- English for README files and project descriptions. Russian for docs/ and
  internal comments.
- No bold markdown (double asterisks) in project documents.
- TypeScript is strict, no any. PowerShell projects carry self-checks or Pester.
- Each project must run on a clean machine following its own README.

## Commit messages

Use conventional commits with a scope:

- feat(scope): new capability
- fix(scope): bug fix
- docs(scope): documentation only
- test(scope): tests only
- chore(scope): maintenance

Example: fix(p03-linux-lab): make mode detection work without a TTY

## Workflow

1. Open an issue describing the change and the expected effect.
2. Create a branch from main.
3. Make the change, add or update tests, run the quality gate.
4. Open a pull request. CI must pass.
5. A human reviews and approves before merge.

## Code of conduct

Be concise, be honest, keep dependencies minimal. If a change needs a paid
service or a real API key to be verified, mark the network step optional and
keep the default path working without keys.