# --------------------------------------------------------------------------
# Function App
# --------------------------------------------------------------------------

resource "azurerm_service_plan" "api" {
  name                   = var.project_prefix
  resource_group_name    = data.azurerm_resource_group.sharepass.name
  location               = data.azurerm_resource_group.sharepass.location
  sku_name               = "FC1"
  os_type                = "Linux"
  zone_balancing_enabled = false
}

locals {
  blobStorageAndContainer = "${azurerm_storage_account.sharepass.primary_blob_endpoint}${azurerm_storage_container.apiDeployment.name}"
}

resource "azurerm_function_app_flex_consumption" "api" {
  name                        = var.project_global_prefix
  resource_group_name         = data.azurerm_resource_group.sharepass.name
  location                    = data.azurerm_resource_group.sharepass.location
  service_plan_id             = azurerm_service_plan.api.id
  storage_container_type      = "blobContainer"
  storage_container_endpoint  = local.blobStorageAndContainer
  storage_authentication_type = "SystemAssignedIdentity"
  runtime_name                = "node"
  runtime_version             = "22"
  maximum_instance_count      = 10
  instance_memory_in_mb       = 512

  identity {
    type = "SystemAssigned"
  }

  site_config {
    cors {
      allowed_origins = [
        "https://${azurerm_static_web_app.swa.default_host_name}"
      ]
      support_credentials = false
    }
  }

  app_settings = {
    "AzureWebJobsStorage" = "" // Workaround until: https://github.com/hashicorp/terraform-provider-azurerm/pull/29099
    "AzureWebJobsStorage__accountName" = azurerm_storage_account.sharepass.name
  }
}

# --------------------------------------------------------------------------
# Role Assignment
# --------------------------------------------------------------------------

resource "azurerm_role_assignment" "api_blob_contributor" {
  scope = azurerm_storage_account.sharepass.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id = azurerm_function_app_flex_consumption.api.identity.0.principal_id
  principal_type = "ServicePrincipal"
}

# --------------------------------------------------------------------------
# Outputs
# --------------------------------------------------------------------------

output "api_hostname" {
  value = azurerm_function_app_flex_consumption.api.default_hostname
}
