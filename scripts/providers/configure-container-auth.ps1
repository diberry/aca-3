[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string] $ResourceGroup,
    [Parameter(Mandatory)]
    [string] $ContainerApp,
    [Parameter(Mandatory)]
    [string] $ManagedIdentityResourceId,
    [Parameter(Mandatory)]
    [string] $VaultName,
    [Parameter(Mandatory)]
    [string] $TenantId,
    [Parameter(Mandatory)]
    [string] $EntraClientId,
    [Parameter(Mandatory)]
    [string] $GoogleClientId,
    [Parameter(Mandatory)]
    [string] $GitHubClientId
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Get-SecretUri([string] $Name) {
    $uri = (& az keyvault secret show `
            --vault-name $VaultName `
            --name $Name `
            --query id `
            --output tsv `
            --only-show-errors | Out-String).Trim()
    if ($LASTEXITCODE -ne 0) {
        throw "Could not resolve the requested Key Vault secret."
    }
    return $uri
}

$entraUri = Get-SecretUri 'entra-client-secret'
$googleUri = Get-SecretUri 'google-client-secret'
$githubUri = Get-SecretUri 'github-client-secret'

& az containerapp secret set --resource-group $ResourceGroup --name $ContainerApp --secrets `
    "entra-provider-secret=keyvaultref:$entraUri,identityref:$ManagedIdentityResourceId" `
    "google-provider-secret=keyvaultref:$googleUri,identityref:$ManagedIdentityResourceId" `
    "github-provider-secret=keyvaultref:$githubUri,identityref:$ManagedIdentityResourceId" `
    --only-show-errors --output none
if ($LASTEXITCODE -ne 0) { throw "Configuring Key Vault references failed." }

& az containerapp auth microsoft update --resource-group $ResourceGroup --name $ContainerApp `
    --client-id $EntraClientId `
    --client-secret-name entra-provider-secret `
    --issuer "https://login.microsoftonline.com/$TenantId/v2.0" `
    --yes --only-show-errors --output none
if ($LASTEXITCODE -ne 0) { throw "Configuring Entra authentication failed." }

& az containerapp auth google update --resource-group $ResourceGroup --name $ContainerApp `
    --client-id $GoogleClientId `
    --client-secret-name google-provider-secret `
    --yes --only-show-errors --output none
if ($LASTEXITCODE -ne 0) { throw "Configuring Google authentication failed." }

& az containerapp auth github update --resource-group $ResourceGroup --name $ContainerApp `
    --client-id $GitHubClientId `
    --client-secret-name github-provider-secret `
    --yes --only-show-errors --output none
if ($LASTEXITCODE -ne 0) { throw "Configuring GitHub authentication failed." }

& az containerapp auth update --resource-group $ResourceGroup --name $ContainerApp `
    --unauthenticated-client-action RedirectToLoginPage `
    --redirect-provider azureactivedirectory `
    --only-show-errors --output none
if ($LASTEXITCODE -ne 0) { throw "Enforcing authenticated access failed." }

Write-Host 'Container Apps built-in authentication configuration completed.'
