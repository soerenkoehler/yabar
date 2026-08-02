#!/bin/bash

source "./deploy/@get-output.sh"

# --------------------
# build functions
# --------------------
pushd ./src/api
func pack --skip-install # install is done as build step

# --------------------
# deploy function using
# curl for faster deployment
# --------------------
curl \
    -X POST \
    -H "Authorization: Bearer $(az account get-access-token | jq -r '.accessToken')" \
    -H "Content-type: application/zip" \
    --data-binary @./api.zip \
    "https://$FUNCTION_NAME.scm.azurewebsites.net/api/publish"
popd
