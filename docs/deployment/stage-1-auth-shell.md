# Stage 1 Auth/Shell deployment preparation

## Current state and boundary

This repository is **prepared and validated only**. No Azure resource, provider application,
OAuth credential, or Key Vault secret has been created. Auth/Shell is the only service in
`azure.yaml`; Author and Backend remain internal architectural components and are not deployed
in Stage 1.

The exact local directory for every later `azd` command is:

`C:\Users\diberry\repos\project-dina\repos\aca-3\aca-3`

## Prepared architecture

- One externally ingressed Azure Container App for Auth/Shell with insecure HTTP disabled.
- One Container Apps environment with Log Analytics.
- One access-controlled Azure Container Registry with admin and anonymous access disabled.
- One user-assigned managed identity used for ACR pull and Key Vault secret references.
- One RBAC-enabled Key Vault with purge protection and 90-day soft-delete retention.
- Multiple Container Apps revision mode for overlap validation and traffic rollback.
- Consumption scaling from zero to three replicas.

The vault endpoint is public so an authorized operator can perform initial ingestion from a
workstation. Azure RBAC is the authorization boundary. Moving the vault to private networking
requires a separately approved VNet/private-endpoint design.

## Prerequisites

Install and authenticate these tools before the later operator-run steps:

- Azure CLI with the Container Apps extension
- Azure Developer CLI
- Bicep CLI through `az bicep`
- Docker
- PowerShell 7 on Windows, or a POSIX-compatible shell
- `gh` only for repository operations; it cannot create or rotate GitHub OAuth App secrets

The operator needs permission to create resources in the chosen subscription, assign roles,
create an Entra application in the chosen tenant, and set secrets in the new vault.

## Choose context only at runtime

From the exact directory above, the operator later chooses the environment, subscription,
tenant, and region. Do not commit `.azure` environment values.

```powershell
az login --tenant <tenant-selected-by-operator>
azd auth login
azd env new <environment-name>
azd env set AZURE_SUBSCRIPTION_ID (az account show --query id --output tsv)
azd env set AZURE_LOCATION <region-selected-by-operator>
azd provision --preview
```

```sh
az login --tenant "<tenant-selected-by-operator>"
azd auth login
azd env new "<environment-name>"
azd env set AZURE_SUBSCRIPTION_ID "$(az account show --query id --output tsv)"
azd env set AZURE_LOCATION "<region-selected-by-operator>"
azd provision --preview
```

Review the preview for one resource group, Auth/Shell only, expected role assignments, and no
Author or Backend Container Apps. The preview is not authorization to provision.

## Later provisioning sequence

Only after a separate explicit decision to create resources, the operator runs:

```text
azd provision
azd env get-values
```

Do not paste `azd env get-values` output into logs or issues. Use the resulting Auth URL to form
the callbacks:

| Provider | Callback |
|---|---|
| Entra | `https://<auth-fqdn>/.auth/login/aad/callback` |
| Google | `https://<auth-fqdn>/.auth/login/google/callback` |
| GitHub | `https://<auth-fqdn>/.auth/login/github/callback` |

Follow [provider registration and rotation](../providers/README.md), then configure built-in
authentication with the prepared `configure-container-auth` script. Finally, deploy the pinned
Auth/Shell image:

```text
azd deploy auth
```

No command in this section was run during preparation.

## Post-deployment validation

1. Record the exact image digest and `AUTH_REVISION_NAME`; never use a mutable tag as evidence.
2. Confirm plain HTTP redirects or is rejected and the effective endpoint is HTTPS.
3. Confirm an unauthenticated request is redirected to Entra.
4. Exercise Entra, Google, and GitHub sign-in without recording tokens, cookies, identifiers, or
   raw authentication headers.
5. Confirm no Author or Backend Container App exists in the Stage 1 resource group.
6. Confirm the managed identity can pull the image and resolve provider secret references.
7. Confirm ACR admin access and anonymous pull remain disabled.

## Rotation and rollback

Provider rotation always creates a replacement credential or Key Vault version before cutover.
Validate sign-in before revoking the prior provider credential or disabling the prior Key Vault
version. The scripts never revoke or delete an earlier credential.

For an application rollback:

1. List revisions and identify the previously verified immutable image/revision.
2. Move 100 percent of traffic to that revision.
3. Repoint provider secret references to the prior enabled Key Vault version if credential
   rollback is also required.
4. Verify all sign-in paths before revoking anything.

## Cleanup

Cleanup is destructive and intentionally not automated here. After explicit approval, inventory
the resource group, provider apps, active credentials, Key Vault recovery implications, and
retained revisions. Delete provider credentials/apps separately from Azure resources only after
ownership and rollback requirements are resolved. Purge protection prevents immediate permanent
vault deletion.
