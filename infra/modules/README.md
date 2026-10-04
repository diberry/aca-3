# Infrastructure modules

Stage 1 prepares these resource-group-scoped modules:

- `log-analytics.bicep`
- `container-apps-environment.bicep`
- `container-registry.bicep`
- `managed-identity.bicep`
- `key-vault.bicep`
- `role-assignments.bicep`
- `auth-shell-container-app.bicep`

`infra/main.bicep` composes them at subscription scope. Only Auth/Shell is a deployable
Container App in this stage. Author and Backend remain internal and are not instantiated.
