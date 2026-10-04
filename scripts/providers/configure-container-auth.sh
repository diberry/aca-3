#!/usr/bin/env sh
set -eu

if [ "$#" -ne 8 ]; then
  echo "Usage: $0 RESOURCE_GROUP CONTAINER_APP IDENTITY_RESOURCE_ID VAULT_NAME TENANT_ID ENTRA_CLIENT_ID GOOGLE_CLIENT_ID GITHUB_CLIENT_ID" >&2
  exit 2
fi

resource_group=$1
container_app=$2
identity_resource_id=$3
vault_name=$4
tenant_id=$5
entra_client_id=$6
google_client_id=$7
github_client_id=$8

entra_uri=$(az keyvault secret show --vault-name "$vault_name" --name entra-client-secret --query id --output tsv --only-show-errors)
google_uri=$(az keyvault secret show --vault-name "$vault_name" --name google-client-secret --query id --output tsv --only-show-errors)
github_uri=$(az keyvault secret show --vault-name "$vault_name" --name github-client-secret --query id --output tsv --only-show-errors)

az containerapp secret set --resource-group "$resource_group" --name "$container_app" --secrets \
  "entra-provider-secret=keyvaultref:$entra_uri,identityref:$identity_resource_id" \
  "google-provider-secret=keyvaultref:$google_uri,identityref:$identity_resource_id" \
  "github-provider-secret=keyvaultref:$github_uri,identityref:$identity_resource_id" \
  --only-show-errors --output none

az containerapp auth microsoft update --resource-group "$resource_group" --name "$container_app" \
  --client-id "$entra_client_id" \
  --client-secret-name entra-provider-secret \
  --issuer "https://login.microsoftonline.com/$tenant_id/v2.0" \
  --yes --only-show-errors --output none

az containerapp auth google update --resource-group "$resource_group" --name "$container_app" \
  --client-id "$google_client_id" \
  --client-secret-name google-provider-secret \
  --yes --only-show-errors --output none

az containerapp auth github update --resource-group "$resource_group" --name "$container_app" \
  --client-id "$github_client_id" \
  --client-secret-name github-provider-secret \
  --yes --only-show-errors --output none

az containerapp auth update --resource-group "$resource_group" --name "$container_app" \
  --unauthenticated-client-action RedirectToLoginPage \
  --redirect-provider azureactivedirectory \
  --only-show-errors --output none

echo "Container Apps built-in authentication configuration completed."
