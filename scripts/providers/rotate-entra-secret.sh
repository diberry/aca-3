#!/usr/bin/env sh
set -eu

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 APPLICATION_ID VAULT_NAME" >&2
  exit 2
fi

application_id=$1
vault_name=$2
secret=
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

credential_stored=yes
echo "A new Entra credential and Key Vault version were created. The prior credential remains active."
