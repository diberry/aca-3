[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string] $DisplayName,
    [Parameter(Mandatory)]
    [ValidatePattern('^https://')]
    [string] $RedirectUri,
    [Parameter(Mandatory)]
    [string] $VaultName,
    [string] $ApplicationId,
    [string] $SecretName = 'entra-client-secret',
    [ValidateRange(1, 2)]
    [int] $ValidityYears = 1
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Invoke-AzText {
    param([Parameter(ValueFromRemainingArguments)][string[]] $Arguments)
    $value = & az @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Azure CLI command failed."
    }
    return ($value | Out-String).Trim()
}

$secret = $null
try {
    if ([string]::IsNullOrWhiteSpace($ApplicationId)) {
        $ApplicationId = Invoke-AzText ad app create `
            --display-name $DisplayName `
            --sign-in-audience AzureADMyOrg `
            --web-redirect-uris $RedirectUri `
            --query appId `
            --output tsv `
            --only-show-errors
    }
    else {
        & az ad app update `
            --id $ApplicationId `
            --web-redirect-uris $RedirectUri `
            --only-show-errors `
            --output none
        if ($LASTEXITCODE -ne 0) {
            throw "The Entra application update failed."
        }
    }

    $secret = Invoke-AzText ad app credential reset `
        --id $ApplicationId `
        --append `
        --display-name 'aca-auth-overlap' `
        --years $ValidityYears `
        --query password `
        --output tsv `
        --only-show-errors

    & az keyvault secret set `
        --vault-name $VaultName `
        --name $SecretName `
        --value $secret `
        --only-show-errors `
        --output none
    if ($LASTEXITCODE -ne 0) {
        throw "Storing the Entra credential in Key Vault failed."
    }

    & az keyvault secret set `
        --vault-name $VaultName `
        --name 'entra-client-id' `
        --value $ApplicationId `
        --only-show-errors `
        --output none
    if ($LASTEXITCODE -ne 0) {
        throw "Storing the Entra client identifier in Key Vault failed."
    }

    Write-Host 'Entra application configuration and Key Vault storage completed.'
}
finally {
    $secret = $null
}
