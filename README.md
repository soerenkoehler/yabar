![](artwork/burn-after-reading-small.png)

# YABAR: Yet Another Burn After Reading

## What is it

A tiny secret sharing tool that can run in the Azure free resp. low consumption
tier.

## Architecture

![](artwork/architecture.svg)

## Manual Preparation: Github Actions

### Github Action Secrets

| Name                  | Description                                           |
|-----------------------|-------------------------------------------------------|
| AUTH_GOOGLE_CLIENT_ID | Google Client ID used for the user side OAuth process |
| AZURE_CLIENT_ID       | Azure app registration used for the Github workflow   |
| AZURE_SUBSCRIPTION_ID | target Azure subscription                             |
| AZURE_TENANT_ID       | target Azure tenant                                   |

### Github Action Variables

| Name                    | Description                                         |
|-------------------------|-----------------------------------------------------|
| PROJECT_PREFIX          | short name used for resource names                  |
| PROJECT_RESOURCE_GROUP  | resource group where the app is deployed            |
| TFSTATE_RESOURCE_GROUP  | resource group where the tfstate storage is located |
| TFSTATE_STORAGE_ACCOUNT | storage account holding the tfstate container       |

## Manual Preparation: Azure

### Terraform/Tofu

If you don't have one: create a storage account for the tfstate backend.

### Role Assignements

| Principal         | Role                                    | Scope                    |
|-------------------|-----------------------------------------|--------------------------|
| <AZURE_CLIENT_ID> | Terraform Resource Provider Registrar   | <AZURE_SUBSCRIPTION_ID>  |
| <AZURE_CLIENT_ID> | Reader                                  | <AZURE_SUBSCRIPTION_ID>  |
| <AZURE_CLIENT_ID> | Contributor                             | <PROJECT_RESOURCE_GROUP> |
| <AZURE_CLIENT_ID> | Role Based Access Control Administrator | <PROJECT_RESOURCE_GROUP> |
| <AZURE_CLIENT_ID> | Storage Blob Data Contributor           | <PROJECT_RESOURCE_GROUP> |

#### Role Definition: Terraform Resource Provider Registrar

```json
{
  "id": "/subscriptions/***/providers/Microsoft.Authorization/roleDefinitions/***",
  "properties": {
    "roleName": "Terraform Resource Provider Registrar",
    "description": "Allows the registration of Azure Resource Providers at the subscription scope.",
    "assignableScopes": [
      "/subscriptions/***"
    ],
    "permissions": [
      {
        "actions": [
          "Microsoft.Resources/subscriptions/providers/read",
          "*/register/action"
        ],
        "notActions": [],
        "dataActions": [],
        "notDataActions": []
      }
    ]
  }
}
```

## Manual Preparation: Google

1. Open [Google Cloud Console][google-cloud]
2. Create a project
3. Under [APIs and services][google-cloud-api] select [OAuth consent
   screen][google-cloud-auth]
4. Setup the general info for your project
5. Create a [Client][google-cloud-clients]
    *   For local testing with swa-cli add the authorised origin
        http://localhost:4280.
    *   For production enter the real URL of the deployed app.
    *   The client secret value is only required, if you test with Bruno or
        other API clients.

## F.A.Q.

### Why another such tool?

### Why is the backend a separate function app and not the function api provided by the static web app?

### How secure is it?

# Licenses

https://www.1001fonts.com/maytra-font.html

# Notes

https://www.bpb.de/themen/innere-sicherheit/dossier-innere-sicherheit/577732/quellen-telekommunikationsueberwachung-quellen-tkue/

https://netzpolitik.org/2021/catch-me-if-you-can-quellen-telekommunikationsueberwachung-zwischen-recht-und-technik/

----

[google-cloud]:         https://console.cloud.google.com/
[google-cloud-api]:     https://console.cloud.google.com/apis/dashboard
[google-cloud-auth]:    https://console.cloud.google.com/auth/overview
[google-cloud-clients]: https://console.cloud.google.com/auth/clients
