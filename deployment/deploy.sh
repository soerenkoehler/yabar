#!/bin/bash
set -euo pipefail

if [[ -z "${DEPLOYMENT_TOKEN:-}" ]]; then
    DEPLOYMENT_TOKEN=$(
        az staticwebapp secrets list --name sharepass \
        | jq -r '.properties.apiKey'
    )
fi

printf "\033[92mToken acquired.\033[0m\n"

DEPLOY_ENV="${DEPLOY_ENV:-production}"
DEPLOYMENT_TOKEN=$(terraform output -raw swa_deployment_token)

docker run --rm \
    -v "$PWD/src:/workspace/dist" \
    ghcr.io/soerenkoehler-org/docker-swacli:main \
    deploy \
        --env "$DEPLOY_ENV" \
        --deployment-token "$DEPLOYMENT_TOKEN" \
        ./dist
