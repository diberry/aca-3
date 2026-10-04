#!/usr/bin/env sh
set -eu

if [ "$#" -lt 3 ] || [ "$#" -gt 4 ]; then
  echo "Usage: $0 DISPLAY_NAME HTTPS_REDIRECT_URI VAULT_NAME [APPLICATION_ID]" >&2
  exit 2
fi

display_name=$1
redirect_uri=$2
vault_name=$3
application_id=${4:-}
secret=

case "$redirect_uri" in
  https://*) ;;
  *)
    echo "The redirect URI must use HTTPS." >&2
    exit 2
    ;;
esac

cleanup() {
  secret=
  unset secret
}
trap cleanup EXIT HUP INT TERM

if [ -z "$application_id" ]; then
  application_id=$(az ad app create \
    --display-name "$display_name" \
    --sign-in-audience AzureADMyOrg \
    --web-redirect-uris "$redirect_uri" \
    --query appId \
    --output tsv \
    --only-show-errors)
else
  az ad app update \
    --id "$application_id" \
    --web-redirect-uris "$redirect_uri" \
    --only-show-errors \
    --output none
fi

secret=$(az ad app credential reset \
  --id "$application_id" \
  --append \
  --display-name aca-auth-overlap \
  --years 1 \
  --query password \
  --output tsv \
  --only-show-errors)

az keyvault secret set \
  --vault-name "$vault_name" \
  --name entra-client-secret \
  --value "$secret" \
  --only-show-errors \
  --output none

az keyvault secret set \
  --vault-name "$vault_name" \
  --name entra-client-id \
  --value "$application_id" \
  --only-show-errors \
  --output none

echo "Entra application configuration and Key Vault storage completed."
