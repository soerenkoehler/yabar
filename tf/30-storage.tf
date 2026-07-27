# --------------------------------------------------------------------------
# Storage account
# --------------------------------------------------------------------------

resource "azurerm_storage_account" "sharepass" {
  name                = var.project_global_prefix
  resource_group_name = data.azurerm_resource_group.sharepass.name
  location            = data.azurerm_resource_group.sharepass.location

  account_tier             = "Standard"
  account_replication_type = "LRS"
  account_kind             = "StorageV2"

  min_tls_version = "TLS1_2"

  shared_access_key_enabled       = false
  allow_nested_items_to_be_public = false
  public_network_access_enabled   = true
  default_to_oauth_authentication = true
}

# --------------------------------------------------------------------------
# Message Storage Table
# --------------------------------------------------------------------------
resource "azapi_resource" "messages" {
  type      = "Microsoft.Storage/storageAccounts/tableServices/tables@2023-05-01"
  name      = "messages"
  parent_id = "${azurerm_storage_account.sharepass.id}/tableServices/default"
  body      = {}
}

# --------------------------------------------------------------------------
# Function App Deployment Container
# --------------------------------------------------------------------------

resource "azurerm_storage_container" "apiDeployment" {
  name                  = "deploymentpackage"
  storage_account_id    = azurerm_storage_account.sharepass.id
  container_access_type = "private"
}
