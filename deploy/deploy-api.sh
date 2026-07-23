#!/bin/bash

source ./deploy/get-output.sh

# --------------------
# fix AzureWebJobStorage setting
# --------------------
FUNCTION_NAME=$(
    jq -r '.api_function_name.value // ""' <<<"$OUTPUT"
)
az functionapp config appsettings delete \
    --name "$FUNCTION_NAME" \
    --resource-group "$PROJECT_RESOURCE_GROUP" \
    --setting-names AzureWebJobStorage

# --------------------
# build functions
# --------------------
push ./swa/api
npm install
zip -9r deploy.zip
popd

# --------------------
# deploy functions
# --------------------
az functionapp deployment source config-zip \
    --src ./swa/api/deploy.zip \
    --name "$FUNCTION_NAME" \
    --resource-group "$PROJECT_RESOURCE_GROUP" \
    --build-remote false
