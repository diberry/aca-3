#!/usr/bin/env sh
set -eu

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 APPLICATION_ID VAULT_NAME" >&2
  exit 2
fi

application_id=$1
vault_name=$2
secret=

cleanup() {
  secret=
  unset secret
}
trap cleanup EXIT HUP INT TERM

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

echo "A new Entra credential and Key Vault version were created. The prior credential remains active."
