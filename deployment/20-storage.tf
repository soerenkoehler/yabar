# --------------------------------------------------------------------------
# Storage account
# --------------------------------------------------------------------------

resource "azurerm_storage_account" "sharepass" {
  name                = "${variable.project_prefix}"
  resource_group_name = azurerm_resource_group.sharepass.name
  location            = azurerm_resource_group.sharepass.location

  account_tier             = "Standard"
  account_replication_type = "LRS"
  account_kind             = "StorageV2"

  min_tls_version = "TLS1_2"

  shared_access_key_enabled = false
  public_network_access_enabled = true
}

# --------------------------------------------------------------------------
# Storage queue
# --------------------------------------------------------------------------

resource "azurerm_storage_queue" "sharepass" {
  name               = "sharepass-queue"
  storage_account_id = azurerm_storage_account.sharepass.id
}
