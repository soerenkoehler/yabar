resource "azurerm_service_plan" "sharepass" {
  name                   = "sharepass"
  resource_group_name    = data.azurerm_resource_group.sharepass.name
  location               = data.azurerm_resource_group.sharepass.location
  sku_name               = "FC1"
  os_type                = "Linux"
  zone_balancing_enabled = false
}

locals {
  blobStorageAndContainer = "${azurerm_storage_account.sharepass.primary_blob_endpoint}deploymentpackage"
}

resource "azurerm_function_app_flex_consumption" "functionApps" {
  name                        = "sharepass"
  resource_group_name         = data.azurerm_resource_group.sharepass.name
  location                    = data.azurerm_resource_group.sharepass.location
  service_plan_id             = azurerm_service_plan.sharepass.id
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
    # XXX maybe
    # application_insights_connection_string = azurerm_application_insights.appInsights.connection_string
  }

  app_settings = {
    "AzureWebJobsStorage" = "" //workaround until https://github.com/hashicorp/terraform-provider-azurerm/pull/29099 gets released
    "AzureWebJobsStorage__accountName" = azurerm_storage_account.sharepass.name
  }
}

resource "azurerm_role_assignment" "storage_roleassignment" {
  scope = azurerm_storage_account.sharepass.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id = azurerm_function_app_flex_consumption.functionApps.identity.0.principal_id
  principal_type = "ServicePrincipal"
}
