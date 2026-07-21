resource "azurerm_service_plan" "sharepass" {
  name                   = var.project_prefix
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
  name                        = var.project_global_prefix
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

  site_config {}

  app_settings = {}
}

resource "azurerm_role_assignment" "storage_roleassignment" {
  scope = azurerm_storage_account.sharepass.id
  role_definition_name = "Storage Blob Data Owner"
  principal_id = azurerm_function_app_flex_consumption.functionApps.identity.0.principal_id
  principal_type = "ServicePrincipal"
}
