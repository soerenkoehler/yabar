#!/bin/bash
set -euo pipefail

DEPLOY_ENV="${DEPLOY_ENV:-preview}"
DEPLOYMENT_TOKEN=$(
    tofu output -json 2>/dev/null || true \
    | jq -r '.swa_deployment_token.value // ""'
)

if [[ -z "${DEPLOYMENT_TOKEN:-}" ]]; then
    DEPLOYMENT_TOKEN=$(
        az staticwebapp secrets list --name swa-sharepass \
        | jq -r '.properties.apiKey'
    )
fi

docker run --rm \
    -v "$PWD/../swa:/workspace" \
    ghcr.io/soerenkoehler-org/docker-swacli:main \
    deploy \
        --verbose silly \
        --env "$DEPLOY_ENV" \
        --deployment-token "$DEPLOYMENT_TOKEN" \
