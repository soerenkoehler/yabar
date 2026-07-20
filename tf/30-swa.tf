# --------------------------------------------------------------------------
# Static Web App (Free tier)
# --------------------------------------------------------------------------

resource "azurerm_static_web_app" "sharepass" {
  name                = var.project_prefix
  resource_group_name = data.azurerm_resource_group.sharepass.name
  location            = data.azurerm_resource_group.sharepass.location

  sku_tier = "Free"
  sku_size = "Free"

  app_settings = {
  }
}

# --------------------------------------------------------------------------
# Outputs
# --------------------------------------------------------------------------

output "swa_name" {
  value = azurerm_static_web_app.sharepass.name
}

output "swa_host_name" {
  value = azurerm_static_web_app.sharepass.default_host_name
}

output "swa_deployment_token" {
  value     = azurerm_static_web_app.sharepass.api_key
  sensitive = true
}
