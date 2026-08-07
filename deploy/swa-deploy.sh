#!/bin/bash

source "./deploy/@get-output.sh"

# --------------------
# create config file
# --------------------
jq -r <<<"$OUTPUT" >./src/web/config.json \
    '{
        backend_hostname: "https://\(.backend_hostname.value)"
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
