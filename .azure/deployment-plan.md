# ACA-3 Stage 1 Deployment Plan

**Status:** Validated — Ready for User Provisioning
**Scope:** Preparation and validation only; no provisioning or deployment.
**Tracking issue:** https://github.com/diberry/aca-3/issues/12

## Approved boundary

- [x] Create this plan before repository analysis.
- [x] Analyze the existing monorepo and requirements.
- [x] Finalize the Stage 1 Auth/Shell preparation design.
- [x] Add failing deployment-contract tests and record red evidence.
- [x] Implement parameterized azd, Bicep, provider scripts, and documentation.
- [x] Validate without provisioning or deployment.
- [x] Set final status to `Validated — Ready for User Provisioning`.

## Prohibited actions

No Azure resource, provider application, OAuth credential, or Key Vault secret will be created or updated during preparation. Provisioning and deployment commands are explicitly out of scope.

## Requirements and existing application

- **Mode:** Modify an existing Node.js 24 / pnpm 12 TypeScript monorepo.
- **Stage:** Stage 1 Auth/Shell only. Stage 0 is complete.
- **Workload:** The existing `src/auth/Containerfile` builds the public Auth/Shell on port
  8080 from the repository-root Docker context.
- **Deferred workloads:** Author and Backend remain internal architectural components and are
  not declared as azd services or deployed Container Apps in this slice.
- **Cloud context:** Subscription, tenant, azd environment name, and Azure location are selected
  by the operator at runtime. No cloud or provider identifier is committed.
- **Scale/cost:** Consumption workload profile with min replicas zero and max replicas three;
  private Basic ACR and 30-day Log Analytics retention.

## Architecture decisions

| Concern | Decision |
|---|---|
| Orchestration | Azure Developer CLI with subscription-scope Bicep; no template initialization |
| Public workload | One externally ingressed Auth/Shell Container App, HTTPS-only, port 8080 |
| Environment | One Azure Container Apps managed environment backed by Log Analytics |
| Images | Private Azure Container Registry; deployment uses the existing pinned Containerfile |
| Identity | One user-assigned managed identity attached to Auth/Shell |
| Authorization | `AcrPull` scoped to ACR and `Key Vault Secrets User` scoped to the vault |
| Secrets | RBAC Key Vault, soft-delete retention, purge protection, no secret values or outputs |
| Revisions | Multiple revision mode to support later overlap validation and rollback |
| Providers | Provider applications and credentials are created only by an operator after infrastructure exists |

## Bicep modules

- `log-analytics.bicep`
- `container-apps-environment.bicep`
- `container-registry.bicep`
- `managed-identity.bicep`
- `key-vault.bicep`
- `role-assignments.bicep`
- `auth-shell-container-app.bicep`

Local modules are used because the repository contract requires individually testable,
stage-bounded modules and the Auth/Shell resource needs explicit azd service tags and ingress
invariants. Resource schemas were checked against the Azure Bicep schema service. Stable API
versions are selected to avoid preview dependencies.

## Provider preparation

- **Microsoft Entra:** Later operator-run scripts create or update a single-tenant web app,
  add only the callback URI needed by Container Apps built-in authentication, append a
  time-bounded secret, and stream it directly into Key Vault. The new secret is created before
  cutover and the previous credential is not deleted automatically.
- **Google:** Standard Google OAuth web-client creation and secret rotation have no supported
  general-purpose automation API. Documentation gives exact console steps; ingestion scripts
  read the returned secret without echoing or persisting it and create a new Key Vault version.
- **GitHub:** OAuth App creation and client-secret rotation have no supported REST or `gh`
  endpoint. Documentation gives exact settings-page steps and the same secure ingestion flow.
- **Built-in auth constraint:** Azure Container Apps built-in authentication requires provider
  client credentials. Workload identity or federation cannot replace the social-provider
  client secret. Managed identity protects the Key Vault retrieval path.

## Security and operations

- Key Vault uses Azure RBAC, purge protection, soft-delete retention, and public network access
  by default so an authorized operator can perform initial secret ingestion. A later private
  endpoint change requires separate network design and approval.
- ACR has anonymous pull and admin credentials disabled.
- Bicep outputs only resource names, endpoints, image name, and revision/FQDN metadata; no
  credential, tenant, subscription, or secret value is output.
- Provider scripts suppress command output containing credential material and clear in-memory
  values in `finally`/trap cleanup.
- Later deployment must use `azd provision` preview/what-if review before application deployment.

## Role assignment verification

- **Status:** Verified statically; no live Azure state queried.
- **Identity:** Auth/Shell user-assigned managed identity.
- **AcrPull:** Data-plane image pull, scoped only to the prepared registry.
- **Key Vault Secrets User:** Data-plane secret read, scoped only to the prepared vault.
- **Management roles:** None assigned to the workload identity.
- **Local operator:** Must already hold separate rights to provision resources, assign roles, and
  ingest secrets; this preparation does not grant them.

## Execution sequence

1. Add and commit a failing production deployment-contract test.
2. Push the red commit, open a draft pull request, and record the failing CI `test` check.
3. Add azd/Bicep, provider scripts, and operator documentation.
4. Set this plan to `Ready for Validation`.
5. Run non-provisioning Bicep, schema, script, focused, full, workflow, and container checks.
6. Set this plan to `Validated — Ready for User Provisioning` and mark the PR ready.

## References

- https://learn.microsoft.com/azure/container-apps/authentication
- https://learn.microsoft.com/azure/container-apps/managed-identity
- https://learn.microsoft.com/azure/container-apps/secrets-managed-identity-key-vault
- https://learn.microsoft.com/cli/azure/ad/app
- https://support.google.com/cloud/answer/6158849
- https://docs.github.com/apps/oauth-apps

## Validation evidence

- [x] All authorized preparation validation checks pass
  - [x] AZD installation
  - [x] Schema validation
  - [x] Environment setup deferred by boundary: operator selects context later
  - [x] Authentication check deferred by boundary: no login or context changes during preparation
  - [x] Subscription/location check deferred by boundary: runtime input
  - [x] Aspire pre-provisioning checks (not an Aspire project)
  - [x] Provision preview deferred by boundary to later operator-run context
  - [x] Build verification
  - [x] Docker build context validation
  - [x] Package validation through the repository's pinned container build workflow
  - [x] Azure Policy validation deferred until subscription selection
  - [x] Aspire post-provisioning checks (not an Aspire project)
  - [x] Bicep build and lint
  - [x] Provider script syntax and static checks
  - [x] Focused deployment-contract tests
  - [x] Full `pnpm validate`
  - [x] Container and workflow checks

Cloud-context validation is explicitly deferred because preparation must not select or persist a
subscription, tenant, or location. The later operator must run `azd provision --preview` and
review applicable Azure Policy before `azd provision`.

## Validation proof

| Check | Evidence | Result |
|---|---|---|
| Red contract | `pnpm exec vitest run tests/deployment/stage1-contract.test.ts` at `0a6a4ad` | Expected 5 failures for missing production artifacts |
| Red CI | https://github.com/diberry/aca-3/actions/runs/37214331388/job/111471670390 | Expected `test` failure recorded |
| azd | `azd version` | Installed (`1.32.0`) |
| `azure.yaml` | Azure Developer CLI official schema validator | Pass |
| Bicep | `az bicep build --file infra\main.bicep`; `az bicep lint --file infra\main.bicep` | Pass, no template diagnostics |
| ARM template | Bicep build emitted valid `infra\main.json`; generated file removed/ignored | Pass |
| Provider scripts | PowerShell parser and `bash -n` over all paired scripts | Pass |
| Auth CLI contract | Help/schema lookup for Entra, Google, GitHub, and global auth commands | Pass |
| Focused green | `pnpm exec vitest run tests/deployment/stage1-contract.test.ts` | 5 passed |
| Full repository | `pnpm validate` | 8 files / 32 tests passed; build, workflows, pins, smoke passed |
| Container/package | https://github.com/diberry/aca-3/actions/runs/37214946033/job/111473445250 | Pass; pinned Auth, Author, and Backend container builds completed |
| PR policy | https://github.com/diberry/aca-3/actions/runs/37214946239 | Pass |
| **Workflow Validation (2026-10-04)** | | |
| AZD Installation | `azd version` | Installed (`1.32.0`); Update available: 1.35.0 |
| Project Build | `npm run build` (tsc + vite build) | Pass; Auth and Author builds completed successfully |
| Bicep Build | `az bicep build --file infra/main.bicep` | Pass; no diagnostics |
| JSON Parameters | `infra/main.parameters.json` schema validation | Pass; valid Azure deployment parameters schema |
| pnpm-lock.yaml | Docker build context validation | Pass; exists and ready for immutable Docker build |
| Docker Context | `src/auth/Containerfile` validation | Pass; pinned base image, multi-stage build, uses pnpm --frozen-lockfile |
| Role Assignments | Static code review of `role-assignments.bicep` | Pass; AcrPull and KeyVault Secrets User roles correctly scoped to resources |
| Role Dependency | Main template dependency graph | Pass; authShell depends on roleAssignments; correct provisioning order |

The local Docker build reached the pinned container build but the workstation Docker engine
rejected the npm registry TLS handshake. The same immutable Containerfiles passed in the clean
GitHub Actions `validate` job above, providing the required container/package evidence without
changing pins or weakening the build.
