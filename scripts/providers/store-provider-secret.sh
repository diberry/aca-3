#!/usr/bin/env sh
set -eu

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 google|github VAULT_NAME" >&2
  exit 2
fi

provider=$1
vault_name=$2
case "$provider" in
  google|github) ;;
  *)
    echo "Provider must be google or github." >&2
    exit 2
    ;;
esac

secret=
cleanup() {
  secret=
  unset secret
}
trap cleanup EXIT HUP INT TERM

printf "Enter the new %s client secret: " "$provider" >&2
stty -echo
IFS= read -r secret
stty echo
printf "\n" >&2

az keyvault secret set \
  --vault-name "$vault_name" \
  --name "$provider-client-secret" \
  --value "$secret" \
  --only-show-errors \
  --output none

echo "A new $provider Key Vault version was created. No prior version was deleted."
