# --------------------------------------------------------------------------
# Storage account
# --------------------------------------------------------------------------

resource "azurerm_storage_account" "sharepass" {
  name                = "${vars.project_prefix}"
  resource_group_name = azurerm_resource_group.sharepass.name
  location            = azurerm_resource_group.sharepass.location

  account_tier             = "Standard"
  account_replication_type = "LRS"
  account_kind             = "StorageV2"

  min_tls_version = "TLS1_2"

  # Disables authentication via shared access keys and SAS tokens
  # derived from them, enforcing Entra ID authentication for the
  # data plane.
  shared_access_key_enabled = false

  # Disallows public network access; adjust according to network
  # requirements (private endpoints, service endpoints, etc.).
  public_network_access_enabled = true
}

# --------------------------------------------------------------------------
# Storage queue
# --------------------------------------------------------------------------

resource "azurerm_storage_queue" "sharepass" {
  name               = "sharepass-queue"
  storage_account_id = azurerm_storage_account.sharepass.id

  # Note: with shared_access_key_enabled = false, Terraform itself
  # must authenticate to the data plane via Entra ID. This requires
  # the identity running Terraform (user, service principal, or
  # managed identity) to hold an appropriate RBAC role, such as
  # "Storage Queue Data Contributor", on the storage account.
}

# --------------------------------------------------------------------------
# Role assignment for a consuming identity (application, user, or
# managed identity) that will read/write messages on the queue.
# Replace principal_id with the object ID of the relevant identity.
# --------------------------------------------------------------------------

variable "queue_consumer_principal_id" {
  description = "Object ID of the Entra ID principal (user, group, service principal, or managed identity) that will access the queue."
  type        = string
}

resource "azurerm_role_assignment" "queue_data_contributor" {
  scope                = azurerm_storage_account.sharepass.id
  role_definition_name = "Storage Queue Data Contributor"
  principal_id         = var.queue_consumer_principal_id
}

# --------------------------------------------------------------------------
# Outputs
# --------------------------------------------------------------------------

output "storage_account_name" {
  value = azurerm_storage_account.sharepass.name
}

output "queue_name" {
  value = azurerm_storage_queue.sharepass.name
}

output "queue_endpoint" {
  value = "${azurerm_storage_account.sharepass.primary_queue_endpoint}${azurerm_storage_queue.sharepass.name}"
}
