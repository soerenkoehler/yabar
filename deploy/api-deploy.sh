#!/bin/bash

source "./deploy/@get-output.sh"

# --------------------
# fix AzureWebJobStorage setting
# --------------------
FUNCTION_NAME=$(
    jq -r '.api_function_name.value // ""' <<<"$OUTPUT"
)
az functionapp config appsettings delete \
    --name "$FUNCTION_NAME" \
    --resource-group "$PROJECT_RESOURCE_GROUP" \
    --setting-names AzureWebJobsStorage

# --------------------
# build functions
# --------------------
pushd ./src/api
func pack --skip-install # install is done as build step

# using curl for fast deployment
curl \
    -X POST \
    -H "Authorization: Bearer $(az account get-access-token | jq -r '.accessToken')" \
    -H "Content-type: application/zip" \
    --data-binary @./api.zip \
    "https://$FUNCTION_NAME.scm.azurewebsites.net/api/publish"
popd
