#!/bin/bash
set -euo pipefail

DEPLOY_ENV="${DEPLOY_ENV:-preview}"
DEPLOYMENT_TOKEN=$(
    tofu output -json 2>/dev/null \
    | jq -r '.swa_deployment_token.value // ""' \
    || true
)

if [[ -z "${DEPLOYMENT_TOKEN:-}" ]]; then
    printf "\033[93mread deployment token from azure\033[0m\n"
    DEPLOYMENT_TOKEN=$(
        az staticwebapp secrets list --name swa-sharepass \
        | jq -r '.properties.apiKey'
    )
else
    printf "\033[93muse deployment token from tofu\033[0m\n"
fi

printf "+++%s+++\n" "$(base64 <<<"$DEPLOYMENT_TOKEN")"

docker run --rm \
    -v "$PWD/../swa:/workspace" \
    ghcr.io/soerenkoehler-org/docker-swacli:main \
    deploy \
        --verbose silly \
        --env "$DEPLOY_ENV" \
        --deployment-token "$DEPLOYMENT_TOKEN" \
