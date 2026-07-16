#!/bin/bash
set -euo pipefail

DEPLOY_ENV="${DEPLOY_ENV:-preview}"
DEPLOYMENT_TOKEN=$(
    tofu output -json \
    | jq -r '.swa_deployment_token // ""'
)

if [[ -z "${DEPLOYMENT_TOKEN:-}" ]]; then
    DEPLOYMENT_TOKEN=$(
        az staticwebapp secrets list --name swa-sharepass \
        | jq -r '.properties.apiKey'
    )
fi

docker run --rm \
    -v "$PWD/../src:/workspace/dist" \
    ghcr.io/soerenkoehler-org/docker-swacli:main \
    deploy \
        --env "$DEPLOY_ENV" \
        --deployment-token "$DEPLOYMENT_TOKEN" \
        ./dist
