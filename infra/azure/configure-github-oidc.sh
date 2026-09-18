#!/usr/bin/env bash
set -euo pipefail

RG="${BLOFY_AZURE_RG:-rg-blofy-player}"
IDENTITY_NAME="${BLOFY_GITHUB_IDENTITY:-blofy-github-oidc}"
FEDERATED_NAME="${BLOFY_GITHUB_FEDERATED_NAME:-blofy-sources-main}"
SUBJECT='repo:i20sss20-maker@317876372/BLOFY-SOURCES@1374207850:ref:refs/heads/main'
ISSUER='https://token.actions.githubusercontent.com'
AUDIENCE='api://AzureADTokenExchange'

command -v az >/dev/null 2>&1 || { echo 'Azure CLI (az) is required.' >&2; exit 1; }
az account show >/dev/null

echo "Configuring GitHub OIDC trust for BLOFY-SOURCES..."
if ! az identity show -g "$RG" -n "$IDENTITY_NAME" >/dev/null 2>&1; then
  echo "Managed identity $IDENTITY_NAME was not found in $RG." >&2
  exit 2
fi

CURRENT="$(az identity federated-credential show   -g "$RG"   --identity-name "$IDENTITY_NAME"   -n "$FEDERATED_NAME"   --query subject -o tsv 2>/dev/null || true)"

if [ -z "$CURRENT" ]; then
  az identity federated-credential create     -g "$RG"     --identity-name "$IDENTITY_NAME"     -n "$FEDERATED_NAME"     --issuer "$ISSUER"     --subject "$SUBJECT"     --audiences "$AUDIENCE"     --only-show-errors >/dev/null
  echo "Created federated credential: $FEDERATED_NAME"
elif [ "$CURRENT" != "$SUBJECT" ]; then
  az identity federated-credential update     -g "$RG"     --identity-name "$IDENTITY_NAME"     -n "$FEDERATED_NAME"     --issuer "$ISSUER"     --subject "$SUBJECT"     --audiences "$AUDIENCE"     --only-show-errors >/dev/null
  echo "Updated federated credential: $FEDERATED_NAME"
else
  echo "Federated credential already matches BLOFY-SOURCES."
fi

CLIENT_ID="$(az identity show -g "$RG" -n "$IDENTITY_NAME" --query clientId -o tsv)"
TENANT_ID="$(az account show --query tenantId -o tsv)"
SUBSCRIPTION_ID="$(az account show --query id -o tsv)"

echo
echo "OIDC READY"
echo "Resource group: $RG"
echo "Identity: $IDENTITY_NAME"
echo "Client ID: $CLIENT_ID"
echo "Tenant ID: $TENANT_ID"
echo "Subscription ID: $SUBSCRIPTION_ID"
echo "Subject: $SUBJECT"
