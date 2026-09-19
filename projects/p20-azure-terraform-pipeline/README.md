# p20-azure-terraform-pipeline

Original pipeline demo: an **azurerm** Terraform stack (state on Azure Storage)
rendered from a typed config, plus an Azure DevOps pipeline that plans then
applies behind an approval environment gate.

Topic note: theme inspired by a DevOps-Projects entry (project-20-azure-terraform-pipeline,
MIT, DevOpsKitchens). The implementation here is original.

## Contents

- `src/model.ts` — config model + validation: EU-only locations, semver
  terraform/location, storage account naming rules, backend key generation.
- `src/azurerm.ts` — renders `main.tf` (provider, state backend, storage
  account/container, resource group, vnet), the `azure-pipelines.yml`
  (init → plan → env gate → apply), and a cheat sheet.
- `src/cli.ts` — `--check` renders the stack and validates it, `--plan`
  interprets the Terraform plan, `--key` computes backend keys.

## Commands

```bash
npm ci
npm run verify   # typecheck + tests
npm run check    # render + validate → "terraform-azure: PASS"
```

## Design notes

- Backend keys are namespaced `workspace/component/scope.tfstate`, no inline
  credentials, no `password =` lines; the storage container stays private.
- The plan gate refuses applies on prod when the plan contains destroys —
  same spirit as the EKS demo but for the AzureRM provider.