# Identity providers

Provider registration, callback URLs, ownership, secret setup, rotation, verification, and
revocation are Stage 1 concerns. No credentials or app registrations are created during
preparation.

This guide prepares Microsoft Entra, Google, and GitHub for Azure Container Apps built-in
authentication. Running any script in this guide mutates provider or Azure state and is reserved
for a later, explicitly authorized operator session.

## Shared rules

- Use the exact HTTPS callback URLs in
  [Stage 1 Auth/Shell preparation](../deployment/stage-1-auth-shell.md).
- Never pass a secret on a command line copied into shell history. The ingestion scripts prompt
  for Google and GitHub secrets.
- A new Key Vault secret version is created before cutover. Previous versions remain available
  for rollback and are never deleted automatically.
- Do not record tenant, subscription, client, credential, or secret values in terminal logs,
  issues, pull requests, screenshots, or validation artifacts.
- Azure Container Apps built-in social authentication requires provider client credentials.
  Managed identity secures Key Vault access but cannot replace a provider credential. Entra
  certificate or federated credentials are preferable for application-to-application flows, but
  the Container Apps built-in interactive provider adapter uses a client-secret setting.

## Microsoft Entra

The prepared scripts use a single-tenant web application and request no Microsoft Graph
application permissions. Standard OpenID Connect sign-in scopes do not require adding broad
Graph permissions.

After infrastructure exists, run one equivalent:

```powershell
.\scripts\providers\configure-entra.ps1 `
  -DisplayName <operator-selected-name> `
  -RedirectUri https://<auth-fqdn>/.auth/login/aad/callback `
  -VaultName <vault-name>
```

```sh
./scripts/providers/configure-entra.sh \
  "<operator-selected-name>" \
  "https://<auth-fqdn>/.auth/login/aad/callback" \
  "<vault-name>"
```

The script creates the application only when no application ID is supplied. For an existing app,
pass its ID as the fourth shell argument or `-ApplicationId` in PowerShell. It appends a
time-bounded credential and writes it immediately to `entra-client-secret` in Key Vault without
printing or persisting the value. It stores the non-secret client identifier in
`entra-client-id` to avoid emitting it.

### Entra rotation

```powershell
.\scripts\providers\rotate-entra-secret.ps1 `
  -ApplicationId <application-id> `
  -VaultName <vault-name>
```

```sh
./scripts/providers/rotate-entra-secret.sh "<application-id>" "<vault-name>"
```

The new Entra credential overlaps the existing credential and creates a new Key Vault version.
After built-in auth is repointed and verified, list credentials with
`az ad app credential list`; revoke only the known prior key with
`az ad app credential delete --key-id <prior-key-id>`. To roll back, repoint the Container App
secret reference to the prior Key Vault version while the prior Entra credential is active.

## Google

Google does not publish a supported general-purpose API or `gcloud` command for creating and
rotating a standard web OAuth client. The similarly named Workforce Identity Federation OAuth
application API is not a replacement for a Google social sign-in client.

Use Google Auth Platform in the selected project:

1. Configure **Branding** and **Audience**, including authorized test users when the app is not
   published.
2. Under **Clients**, create a **Web application**.
3. Add only the Auth/Shell Google callback as an authorized redirect URI.
4. Copy the client ID for later built-in-auth configuration.
5. Copy the newly displayed client secret directly into one equivalent ingestion script:

```powershell
.\scripts\providers\store-provider-secret.ps1 -Provider google -VaultName <vault-name>
```

```sh
./scripts/providers/store-provider-secret.sh google "<vault-name>"
```

For rotation, use the Google console's supported secret-rotation control. If it offers an overlap
period, create the replacement, ingest it as a new Key Vault version, cut over, verify, and only
then disable the old secret. If the selected client supports replacement rather than overlap,
schedule a maintenance window and retain the prior Key Vault version only as audit/rollback
evidence; it cannot restore a credential Google has invalidated.

## GitHub

GitHub does not provide a supported REST or `gh` endpoint to create an OAuth App or generate its
client secrets. OAuth token-management endpoints do not manage the app's client secret.

1. Open GitHub **Settings** > **Developer settings** > **OAuth Apps**.
2. Select **New OAuth App**.
3. Use the Auth/Shell HTTPS origin as the homepage URL.
4. Use only the Auth/Shell GitHub callback as the authorization callback URL.
5. Generate a client secret and immediately run one equivalent ingestion script:

```powershell
.\scripts\providers\store-provider-secret.ps1 -Provider github -VaultName <vault-name>
```

```sh
./scripts/providers/store-provider-secret.sh github "<vault-name>"
```

For rotation, generate a new secret in the GitHub settings page without deleting the previous
secret, ingest it, cut over, and verify GitHub sign-in. Revoke the prior secret manually only
after verification. Roll back by restoring the prior Key Vault version while the previous GitHub
secret remains active.

## Configure Container Apps built-in authentication

The scripts require Azure CLI 2.82.0 or later. They use the current core
`az containerapp auth <provider> update --client-secret-name` contract. If a separately installed
`containerapp` extension overrides the core commands, update it and confirm that each provider's
`update --help` includes `--client-secret-name` before continuing. The obsolete
`--client-secret-setting-name` option is not supported.

After all three secret names exist, use one complete sequence below. Each sequence obtains azd
outputs and runtime tenant data without displaying them, queries the user-assigned identity
resource ID, prompts for the two externally managed client IDs, configures built-in auth, verifies
all providers and the global policy, and only then deploys Auth/Shell.

### PowerShell cutover

```powershell
$resourceGroup = azd env get-value AZURE_RESOURCE_GROUP
$containerApp = azd env get-value AZURE_AUTH_APP_NAME
$identityName = azd env get-value AZURE_AUTH_IDENTITY_NAME
$vaultName = azd env get-value AZURE_KEY_VAULT_NAME
$identityResourceId = az identity show `
  --resource-group $resourceGroup `
  --name $identityName `
  --query id --output tsv --only-show-errors
$tenantId = az account show --query tenantId --output tsv --only-show-errors
$entraClientId = az keyvault secret show `
  --vault-name $vaultName `
  --name entra-client-id `
  --query value --output tsv --only-show-errors
$googleClientId = Read-Host 'Google OAuth client ID'
$gitHubClientId = Read-Host 'GitHub OAuth client ID'

.\scripts\providers\configure-container-auth.ps1 `
  -ResourceGroup $resourceGroup `
  -ContainerApp $containerApp `
  -ManagedIdentityResourceId $identityResourceId `
  -VaultName $vaultName `
  -TenantId $tenantId `
  -EntraClientId $entraClientId `
  -GoogleClientId $googleClientId `
  -GitHubClientId $gitHubClientId

$providers = @('microsoft', 'google', 'github')
foreach ($provider in $providers) {
  $configured = az containerapp auth $provider show `
    --resource-group $resourceGroup `
    --name $containerApp `
    --query 'registration.clientId != null' `
    --output tsv --only-show-errors
  if ($configured -ne 'true') { throw "$provider authentication verification failed." }
}
$authEnabled = az containerapp auth show `
  --resource-group $resourceGroup `
  --name $containerApp `
  --query enabled `
  --output tsv --only-show-errors
$unauthenticatedAction = az containerapp auth show `
  --resource-group $resourceGroup `
  --name $containerApp `
  --query globalValidation.unauthenticatedClientAction `
  --output tsv --only-show-errors
$redirectProvider = az containerapp auth show `
  --resource-group $resourceGroup `
  --name $containerApp `
  --query globalValidation.redirectToProvider `
  --output tsv --only-show-errors
if (
  $authEnabled -ne 'true' -or
  $unauthenticatedAction -ne 'RedirectToLoginPage' -or
  $redirectProvider -ine 'azureactivedirectory'
) {
  throw 'Global authentication policy verification failed.'
}

azd deploy auth
```

### POSIX cutover

```sh
resource_group=$(azd env get-value AZURE_RESOURCE_GROUP)
container_app=$(azd env get-value AZURE_AUTH_APP_NAME)
identity_name=$(azd env get-value AZURE_AUTH_IDENTITY_NAME)
vault_name=$(azd env get-value AZURE_KEY_VAULT_NAME)
identity_resource_id=$(az identity show \
  --resource-group "$resource_group" \
  --name "$identity_name" \
  --query id --output tsv --only-show-errors)
tenant_id=$(az account show --query tenantId --output tsv --only-show-errors)
entra_client_id=$(az keyvault secret show \
  --vault-name "$vault_name" \
  --name entra-client-id \
  --query value --output tsv --only-show-errors)
printf "Google OAuth client ID: " >&2
IFS= read -r google_client_id
printf "GitHub OAuth client ID: " >&2
IFS= read -r github_client_id

./scripts/providers/configure-container-auth.sh \
  "$resource_group" \
  "$container_app" \
  "$identity_resource_id" \
  "$vault_name" \
  "$tenant_id" \
  "$entra_client_id" \
  "$google_client_id" \
  "$github_client_id"

for provider in microsoft google github; do
  configured=$(az containerapp auth "$provider" show \
    --resource-group "$resource_group" \
    --name "$container_app" \
    --query 'registration.clientId != null' \
    --output tsv --only-show-errors)
  [ "$configured" = "true" ] || {
    echo "$provider authentication verification failed." >&2
    exit 1
  }
done
auth_enabled=$(az containerapp auth show \
  --resource-group "$resource_group" \
  --name "$container_app" \
  --query enabled \
  --output tsv --only-show-errors)
unauthenticated_action=$(az containerapp auth show \
  --resource-group "$resource_group" \
  --name "$container_app" \
  --query globalValidation.unauthenticatedClientAction \
  --output tsv --only-show-errors)
redirect_provider=$(az containerapp auth show \
  --resource-group "$resource_group" \
  --name "$container_app" \
  --query globalValidation.redirectToProvider \
  --output tsv --only-show-errors)
[ "$auth_enabled" = "true" ] &&
  [ "$unauthenticated_action" = "RedirectToLoginPage" ] &&
  {
    [ "$redirect_provider" = "azureactivedirectory" ] ||
      [ "$redirect_provider" = "azureActiveDirectory" ]
  } || {
  echo "Global authentication policy verification failed." >&2
  exit 1
}

azd deploy auth
```

The non-secret `AZURE_AUTH_IDENTITY_RESOURCE_ID` azd output is also available for auditing, but
the sequences deliberately query `az identity show` so the cutover verifies the deployed
identity. The scripts:

1. Add versioned Key Vault references as Container App secrets.
2. Configure Entra, Google, and GitHub providers.
3. Require authentication and make Entra the default redirect provider.
4. Suppress CLI output.

Re-run this step after rotation so the versioned Key Vault reference points to the new version,
then validate every provider before revocation.

## Authoritative references

- https://learn.microsoft.com/azure/container-apps/authentication
- https://learn.microsoft.com/azure/container-apps/authentication-entra
- https://learn.microsoft.com/azure/container-apps/secrets-managed-identity-key-vault
- https://learn.microsoft.com/cli/azure/ad/app
- https://support.google.com/cloud/answer/15549257
- https://docs.github.com/apps/oauth-apps
