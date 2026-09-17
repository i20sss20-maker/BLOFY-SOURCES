#!/usr/bin/env bash
set -euo pipefail

RG="${BLOFY_AZURE_RG:-rg-blofy-player}"
REPO_SLUG="${BLOFY_GITHUB_REPO_SLUG:-i20sss20-maker/BLOFY-SOURCES}"
BRANCH="${BLOFY_GITHUB_BRANCH:-main}"
IDENTITY_NAME="${BLOFY_GITHUB_IDENTITY:-blofy-github-oidc}"
FEDERATED_NAME="${BLOFY_GITHUB_FEDERATED_NAME:-blofy-sources-main}"

need(){ command -v "$1" >/dev/null 2>&1 || { echo "Missing command: $1" >&2; exit 1; }; }
need az; need gh
az account show >/dev/null
if ! gh auth status --hostname github.com >/dev/null 2>&1; then
  echo 'GitHub CLI authentication is required.'
  echo 'Run: gh auth login --hostname github.com --git-protocol https --web --scopes workflow'
  exit 2
fi

RG_ID="$(az group show -n "$RG" --query id -o tsv)"
SUBSCRIPTION_ID="$(az account show --query id -o tsv)"
TENANT_ID="$(az account show --query tenantId -o tsv)"
ACR="$(az acr list -g "$RG" --query '[0].name' -o tsv)"
ACR_ID="$(az acr show -n "$ACR" --query id -o tsv)"

if ! az identity show -g "$RG" -n "$IDENTITY_NAME" >/dev/null 2>&1; then
  az identity create -g "$RG" -n "$IDENTITY_NAME" --location "$(az group show -n "$RG" --query location -o tsv)" --only-show-errors >/dev/null
fi
CLIENT_ID="$(az identity show -g "$RG" -n "$IDENTITY_NAME" --query clientId -o tsv)"
PRINCIPAL_ID="$(az identity show -g "$RG" -n "$IDENTITY_NAME" --query principalId -o tsv)"

az role assignment create --assignee-object-id "$PRINCIPAL_ID" --assignee-principal-type ServicePrincipal --role Contributor --scope "$RG_ID" --only-show-errors >/dev/null 2>&1 || true
az role assignment create --assignee-object-id "$PRINCIPAL_ID" --assignee-principal-type ServicePrincipal --role AcrPush --scope "$ACR_ID" --only-show-errors >/dev/null 2>&1 || true

REPO_OWNER="$(gh api "repos/$REPO_SLUG" --jq '.owner.login')"
OWNER_ID="$(gh api "repos/$REPO_SLUG" --jq '.owner.id')"
REPO_NAME="$(gh api "repos/$REPO_SLUG" --jq '.name')"
REPO_ID="$(gh api "repos/$REPO_SLUG" --jq '.id')"
SUBJECT="repo:${REPO_OWNER}@${OWNER_ID}/${REPO_NAME}@${REPO_ID}:ref:refs/heads/${BRANCH}"

CURRENT="$(az identity federated-credential show -g "$RG" --identity-name "$IDENTITY_NAME" -n "$FEDERATED_NAME" --query subject -o tsv 2>/dev/null || true)"
if [ -z "$CURRENT" ]; then
  az identity federated-credential create -g "$RG" --identity-name "$IDENTITY_NAME" -n "$FEDERATED_NAME" --issuer 'https://token.actions.githubusercontent.com' --subject "$SUBJECT" --audiences 'api://AzureADTokenExchange' --only-show-errors >/dev/null
elif [ "$CURRENT" != "$SUBJECT" ]; then
  az identity federated-credential update -g "$RG" --identity-name "$IDENTITY_NAME" -n "$FEDERATED_NAME" --issuer 'https://token.actions.githubusercontent.com' --subject "$SUBJECT" --audiences 'api://AzureADTokenExchange' --only-show-errors >/dev/null
fi

gh variable set AZURE_CLIENT_ID --repo "$REPO_SLUG" --body "$CLIENT_ID"
gh variable set AZURE_TENANT_ID --repo "$REPO_SLUG" --body "$TENANT_ID"
gh variable set AZURE_SUBSCRIPTION_ID --repo "$REPO_SLUG" --body "$SUBSCRIPTION_ID"
gh variable set BLOFY_AZURE_RG --repo "$REPO_SLUG" --body "$RG"

echo "OIDC ready for $REPO_SLUG on $BRANCH"
echo "Subject: $SUBJECT"
echo 'Triggering Deploy BLOFY Sources to Azure Gateway...'
gh workflow run deploy-azure.yml --repo "$REPO_SLUG" --ref "$BRANCH"
echo 'Workflow dispatched. Check GitHub Actions for the deployment result.'
