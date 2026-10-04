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
terminal_state=
cleanup() {
  status=$?
  trap - EXIT
  if [ -n "$terminal_state" ]; then
    stty "$terminal_state" < /dev/tty 2>/dev/null || true
    printf "\n" >&2
    terminal_state=
  fi
  secret=
  unset secret
  exit "$status"
}
trap cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

if [ ! -t 0 ] || [ ! -t 2 ]; then
  echo "Secret input requires an interactive terminal." >&2
  exit 2
fi

printf "Enter the new %s client secret: " "$provider" >&2
terminal_state=$(stty -g < /dev/tty)
stty -echo < /dev/tty
IFS= read -r secret
stty "$terminal_state" < /dev/tty
terminal_state=
printf "\n" >&2

az keyvault secret set \
  --vault-name "$vault_name" \
  --name "$provider-client-secret" \
  --value "$secret" \
  --only-show-errors \
  --output none

echo "A new $provider Key Vault version was created. No prior version was deleted."
