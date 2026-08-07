#!/bin/bash

source "./deploy/@get-output.sh"

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
