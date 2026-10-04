[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string] $ApplicationId,
    [Parameter(Mandatory)]
    [string] $VaultName,
    [string] $SecretName = 'entra-client-secret',
    [ValidateRange(1, 2)]
    [int] $ValidityYears = 1
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$secret = $null

try {
    $secret = (& az ad app credential reset `
            --id $ApplicationId `
            --append `
            --display-name 'aca-auth-overlap' `
            --years $ValidityYears `
            --query password `
            --output tsv `
            --only-show-errors | Out-String).Trim()
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($secret)) {
        throw "Creating the overlapping Entra credential failed."
    }

    & az keyvault secret set `
        --vault-name $VaultName `
        --name $SecretName `
        --value $secret `
        --only-show-errors `
        --output none
    if ($LASTEXITCODE -ne 0) {
        throw "Creating the new Key Vault secret version failed."
    }

    Write-Host 'A new Entra credential and Key Vault version were created. The prior credential remains active.'
}
finally {
    $secret = $null
}
