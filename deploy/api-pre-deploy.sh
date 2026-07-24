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
pushd ./swa/api
npm install
popd
