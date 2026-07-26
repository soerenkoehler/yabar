#!/bin/bash

source "./deploy/@get-output.sh"

# --------------------
# create config file
# --------------------
jq -r <<<"$OUTPUT" >./src/web/config.json \
    --arg auth_google_client_id "$AUTH_GOOGLE_CLIENT_ID" \
    '{
        api_hostname: "https://\(.api_hostname.value)",
        auth_google_client_id: $auth_google_client_id
    }'

# --------------------
# set deployment parameter
# --------------------
DEPLOYMENT_TOKEN=$(
    jq -r '.swa_deployment_token.value // ""' <<<"$OUTPUT"
)

# --------------------
# deploy SWA
# --------------------
pushd ./src
swa deploy \
    --verbose silly \
    --deployment-token "$DEPLOYMENT_TOKEN"
popd
