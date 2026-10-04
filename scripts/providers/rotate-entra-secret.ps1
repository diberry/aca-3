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
$newCredentialKeyId = $null
$credentialStored = $false

function Invoke-AzText {
    param([Parameter(ValueFromRemainingArguments)][string[]] $Arguments)
    $value = & az @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Azure CLI command failed."
    }
    return ($value | Out-String).Trim()
}

try {
    $previousCredentialKeyIds = @(
        (Invoke-AzText ad app credential list `
                --id $ApplicationId `
                --query '[].keyId' `
                --output tsv `
                --only-show-errors) -split '\r?\n' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    )

    $secret = Invoke-AzText ad app credential reset `
        --id $ApplicationId `
        --append `
        --display-name 'aca-auth-overlap' `
        --years $ValidityYears `
        --query password `
        --output tsv `
        --only-show-errors
    if ([string]::IsNullOrWhiteSpace($secret)) {
        throw "Creating the overlapping Entra credential failed."
    }

    $currentCredentialKeyIds = @(
        (Invoke-AzText ad app credential list `
                --id $ApplicationId `
                --query '[].keyId' `
                --output tsv `
                --only-show-errors) -split '\r?\n' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    )
    $createdCredentialKeyIds = @(
        $currentCredentialKeyIds | Where-Object { $_ -notin $previousCredentialKeyIds }
    )
    if ($createdCredentialKeyIds.Count -ne 1) {
        throw "Could not uniquely identify the newly created Entra credential."
    }
    $newCredentialKeyId = $createdCredentialKeyIds[0]

    & az keyvault secret set `
        --vault-name $VaultName `
        --name $SecretName `
        --value $secret `
        --only-show-errors `
        --output none
    if ($LASTEXITCODE -ne 0) {
        throw "Creating the new Key Vault secret version failed."
    }

    $credentialStored = $true
    Write-Host 'A new Entra credential and Key Vault version were created. The prior credential remains active.'
}
catch {
    if (-not $credentialStored -and -not [string]::IsNullOrWhiteSpace($newCredentialKeyId)) {
        & az ad app credential delete `
            --id $ApplicationId `
            --key-id $newCredentialKeyId `
            --only-show-errors `
            --output none
        if ($LASTEXITCODE -ne 0) {
            Write-Warning 'Automatic cleanup of the newly created Entra credential failed; no prior credential was changed.'
        }
    }
    throw
}
finally {
    $secret = $null
    $newCredentialKeyId = $null
}
