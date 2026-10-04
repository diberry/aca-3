[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidateSet('google', 'github')]
    [string] $Provider,
    [Parameter(Mandatory)]
    [string] $VaultName
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$secureSecret = Read-Host "Enter the new $Provider client secret" -AsSecureString
$bstr = [IntPtr]::Zero
$plainSecret = $null

try {
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureSecret)
    $plainSecret = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    & az keyvault secret set `
        --vault-name $VaultName `
        --name "$Provider-client-secret" `
        --value $plainSecret `
        --only-show-errors `
        --output none
    if ($LASTEXITCODE -ne 0) {
        throw "Creating the new Key Vault secret version failed."
    }

    Write-Host "A new $Provider Key Vault version was created. No prior version was deleted."
}
finally {
    $plainSecret = $null
    if ($bstr -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
}
