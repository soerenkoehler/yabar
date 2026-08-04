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
# App Data Blob Container + Seed Blobs
# --------------------------------------------------------------------------

resource "azurerm_storage_container" "appData" {
  name                  = "appdata"
  storage_account_id    = azurerm_storage_account.sharepass.id
  container_access_type = "private"
}

resource "azurerm_storage_blob" "config" {
  name                 = "config"
  storage_container_id = azurerm_storage_container.appData.id
  type                 = "Block"
  content_type         = "application/json"

  source_content = <<-EOT
    {
      "auth_google_client_id": "${var.auth_google_client_id}"
      "expiration_options": [
        {
          "value": "1"
          "label": "1 Hour"
        },
        {
          "value": "24"
          "label": "1 Day"
        },
        {
          "value": "168"
          "label": "1 Week"
        }
      ]
    }
  EOT

  lifecycle {
    ignore_changes = [source_content]
  }
}

resource "azurerm_storage_blob" "users" {
  name                 = "users"
  storage_container_id = azurerm_storage_container.appData.id
  type                 = "Block"
  content_type         = "application/json"

  source_content = <<-EOT
    {
      "test-user@example.com": ["admin", "write"]
    }
  EOT

  lifecycle {
    ignore_changes = [source_content]
  }
}

# --------------------------------------------------------------------------
# Function App Deployment Container
# --------------------------------------------------------------------------

resource "azurerm_storage_container" "apiDeployment" {
  name                  = "deploymentpackage"
  storage_account_id    = azurerm_storage_account.sharepass.id
  container_access_type = "private"
}
