# ACA-3 Stage 1 Deployment Plan

**Status:** Approved — implementation in progress
**Scope:** Preparation and validation only; no provisioning or deployment.
**Tracking issue:** https://github.com/diberry/aca-3/issues/12

## Approved boundary

- [x] Create this plan before repository analysis.
- [x] Analyze the existing monorepo and requirements.
- [x] Finalize the Stage 1 Auth/Shell preparation design.
- [ ] Add failing deployment-contract tests and record red evidence.
- [ ] Implement parameterized azd, Bicep, provider scripts, and documentation.
- [ ] Validate without provisioning or deployment.
- [ ] Set final status to `Validated — Ready for User Provisioning`.

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

_To be populated without provisioning._
