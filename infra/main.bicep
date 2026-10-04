targetScope = 'subscription'

@minLength(3)
@maxLength(24)
@description('The azd environment name used to derive resource names.')
param environmentName string

@minLength(1)
@description('The Azure location selected by the operator at provisioning time.')
param location string

@description('A public bootstrap image replaced by azd deploy with the immutable Auth/Shell image.')
param containerImageName string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

var normalizedEnvironmentName = take(toLower(replace(environmentName, '_', '-')), 20)
var resourceSuffix = take(uniqueString(subscription().id, environmentName, location), 6)
var compactEnvironmentName = take(replace(normalizedEnvironmentName, '-', ''), 10)
var tags = {
  'azd-env-name': environmentName
  stage: '1'
  workload: 'auth-shell'
}
var resourceGroupName = 'rg-${normalizedEnvironmentName}-${resourceSuffix}'
var logAnalyticsName = 'log-${normalizedEnvironmentName}-${resourceSuffix}'
var containerAppsEnvironmentName = 'cae-${normalizedEnvironmentName}-${resourceSuffix}'
var registryName = take('cr${compactEnvironmentName}${resourceSuffix}', 50)
var identityName = 'id-${normalizedEnvironmentName}-${resourceSuffix}'
var keyVaultName = take('kv${compactEnvironmentName}${resourceSuffix}', 24)
var authAppName = 'ca-${normalizedEnvironmentName}-auth-${resourceSuffix}'

resource resourceGroup 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: resourceGroupName
  location: location
  tags: tags
}

module logAnalytics './modules/log-analytics.bicep' = {
  name: 'log-analytics'
  scope: resourceGroup
  params: {
    name: logAnalyticsName
    location: location
    tags: tags
  }
}

module managedIdentity './modules/managed-identity.bicep' = {
  name: 'managed-identity'
  scope: resourceGroup
  params: {
    name: identityName
    location: location
    tags: tags
  }
}

module containerRegistry './modules/container-registry.bicep' = {
  name: 'container-registry'
  scope: resourceGroup
  params: {
    name: registryName
    location: location
    tags: tags
  }
}

module keyVault './modules/key-vault.bicep' = {
  name: 'key-vault'
  scope: resourceGroup
  params: {
    name: keyVaultName
    location: location
    tags: tags
  }
}

module containerAppsEnvironment './modules/container-apps-environment.bicep' = {
  name: 'container-apps-environment'
  scope: resourceGroup
  params: {
    name: containerAppsEnvironmentName
    location: location
    tags: tags
    logAnalyticsCustomerId: logAnalytics.outputs.customerId
    logAnalyticsSharedKey: listKeys(
      resourceId(resourceGroup.name, 'Microsoft.OperationalInsights/workspaces', logAnalyticsName),
      '2022-10-01'
    ).primarySharedKey
  }
}

module roleAssignments './modules/role-assignments.bicep' = {
  name: 'role-assignments'
  scope: resourceGroup
  params: {
    registryName: containerRegistry.outputs.name
    keyVaultName: keyVault.outputs.name
    principalId: managedIdentity.outputs.principalId
  }
}

module authShell './modules/auth-shell-container-app.bicep' = {
  name: 'auth-shell'
  scope: resourceGroup
  dependsOn: [
    roleAssignments
  ]
  params: {
    name: authAppName
    location: location
    tags: tags
    containerAppsEnvironmentId: containerAppsEnvironment.outputs.id
    containerImageName: containerImageName
    registryServer: containerRegistry.outputs.loginServer
    managedIdentityId: managedIdentity.outputs.id
    managedIdentityClientId: managedIdentity.outputs.clientId
  }
}

output AZURE_RESOURCE_GROUP string = resourceGroup.name
output AZURE_CONTAINER_REGISTRY_ENDPOINT string = containerRegistry.outputs.loginServer
output AZURE_CONTAINER_REGISTRY_NAME string = containerRegistry.outputs.name
output AZURE_KEY_VAULT_NAME string = keyVault.outputs.name
output AZURE_LOG_ANALYTICS_WORKSPACE_ID string = logAnalytics.outputs.id
output AZURE_CONTAINER_APP_ENVIRONMENT_NAME string = containerAppsEnvironment.outputs.name
output AZURE_AUTH_APP_NAME string = authShell.outputs.name
output AZURE_AUTH_IDENTITY_NAME string = managedIdentity.outputs.name
output AUTH_URL string = 'https://${authShell.outputs.fqdn}'
output AUTH_REVISION_NAME string = authShell.outputs.latestRevisionName
output AUTH_IMAGE_NAME string = authShell.outputs.imageName
