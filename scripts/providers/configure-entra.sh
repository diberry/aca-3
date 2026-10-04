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

new_credential_key_id=
credential_stored=no

cleanup() {
  status=$?
  trap - EXIT
  if [ "$credential_stored" != "yes" ] && [ -n "$new_credential_key_id" ]; then
    az ad app credential delete \
      --id "$application_id" \
      --key-id "$new_credential_key_id" \
      --only-show-errors \
      --output none ||
      echo "Warning: automatic cleanup of the newly created Entra credential failed; no prior credential was changed." >&2
  fi
  secret=
  new_credential_key_id=
  unset secret
  exit "$status"
}
trap cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

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

previous_credential_key_ids=$(az ad app credential list \
  --id "$application_id" \
  --query '[].keyId' \
  --output tsv \
  --only-show-errors)

secret=$(az ad app credential reset \
  --id "$application_id" \
  --append \
  --display-name aca-auth-overlap \
  --years 1 \
  --query password \
  --output tsv \
  --only-show-errors)

current_credential_key_ids=$(az ad app credential list \
  --id "$application_id" \
  --query '[].keyId' \
  --output tsv \
  --only-show-errors)

created_credential_count=0
for candidate_key_id in $current_credential_key_ids; do
  was_present=no
  for previous_key_id in $previous_credential_key_ids; do
    if [ "$candidate_key_id" = "$previous_key_id" ]; then
      was_present=yes
      break
    fi
  done
  if [ "$was_present" = "no" ]; then
    new_credential_key_id=$candidate_key_id
    created_credential_count=$((created_credential_count + 1))
  fi
done
if [ "$created_credential_count" -ne 1 ]; then
  new_credential_key_id=
  echo "Could not uniquely identify the newly created Entra credential." >&2
  exit 1
fi

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

credential_stored=yes
echo "Entra application configuration and Key Vault storage completed."
