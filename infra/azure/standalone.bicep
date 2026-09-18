param location string = resourceGroup().location
param appName string = 'blofy-xtream'
param managedEnvironmentId string
param identityResourceId string
param identityClientId string
param acrLoginServer string
param storageAccountName string
param keyVaultName string
param image string

resource app 'Microsoft.App/containerApps@2026-01-01' = {
  name: appName
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${identityResourceId}': {}
    }
  }
  properties: {
    managedEnvironmentId: managedEnvironmentId
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 8080
        transport: 'auto'
        allowInsecure: true
      }
      registries: [
        {
          server: acrLoginServer
          identity: identityResourceId
        }
      ]
      secrets: [
        {
          name: 'admin-password'
          keyVaultUrl: 'https://${keyVaultName}.vault.azure.net/secrets/release-admin-password'
          identity: identityResourceId
        }
        {
          name: 'session-secret'
          keyVaultUrl: 'https://${keyVaultName}.vault.azure.net/secrets/blofy-admin-token'
          identity: identityResourceId
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'xtream'
          image: image
          env: [
            { name: 'PORT', value: '8080' }
            { name: 'NODE_ENV', value: 'production' }
            { name: 'ADMIN_PASSWORD', secretRef: 'admin-password' }
            { name: 'SESSION_SECRET', secretRef: 'session-secret' }
            { name: 'AZURE_STORAGE_ACCOUNT', value: storageAccountName }
            { name: 'AZURE_CLIENT_ID', value: identityClientId }
            { name: 'BLOFY_BLOB_CONTAINER', value: 'blofy-xtream' }
            { name: 'DATA_DIR', value: '/tmp/blofy-data' }
            { name: 'SYNC_ON_START', value: 'true' }
            { name: 'SYNC_INTERVAL_MS', value: '21600000' }
            { name: 'SYNC_PROVIDER_CONCURRENCY', value: '3' }
            { name: 'IA_LIMIT', value: '14000' }
            { name: 'IA_SERIES_LIMIT', value: '4500' }
            { name: 'IA_ARABIC_LIMIT', value: '4500' }
            { name: 'IA_FEDFLIX_LIMIT', value: '6000' }
            { name: 'IA_PRELINGER_LIMIT', value: '5000' }
            { name: 'IA_PAGE_CONCURRENCY', value: '3' }
            { name: 'WIKIMEDIA_LIMIT', value: '2500' }
            { name: 'WIKIMEDIA_ARABIC_LIMIT', value: '1500' }
            { name: 'PEERTUBE_LIMIT', value: '6000' }
            { name: 'PEERTUBE_ARABIC_LIMIT', value: '1500' }
            { name: 'PEERTUBE_SEED_CONCURRENCY', value: '3' }
            { name: 'NASA_LIMIT', value: '700' }
            { name: 'FREE_TV_LIMIT', value: '4000' }
            { name: 'ENABLE_FREE_TV', value: 'true' }
            { name: 'FREE_TV_VALIDATE_ARABIC', value: 'true' }
            { name: 'FREE_TV_VALIDATE_CONCURRENCY', value: '12' }
            { name: 'ENABLE_IPTV_ORG', value: 'false' }
            { name: 'ENABLE_XTREAM_SELF_TEST', value: 'true' }
          ]
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 1
      }
    }
  }
}

output fqdn string = app.properties.configuration.ingress.fqdn
output appName string = app.name
