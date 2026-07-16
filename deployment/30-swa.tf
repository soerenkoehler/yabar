# --------------------------------------------------------------------------
# Static Web App (Free tier)
# --------------------------------------------------------------------------

resource "azurerm_static_web_app" "sharepass" {
  name                = "swa-sharepass"
  resource_group_name = azurerm_resource_group.sharepass.name
  location            = azurerm_resource_group.sharepass.location

  sku_tier = "Free"
  sku_size = "Free"
}

# # --------------------------------------------------------------------------
# # Outputs
# # --------------------------------------------------------------------------

# output "static_web_app_name" {
#   value = azurerm_static_web_app.sharepass.name
# }

# output "default_host_name" {
#   value = azurerm_static_web_app.sharepass.default_host_name
# }

# output "api_key" {
#   value     = azurerm_static_web_app.sharepass.api_key
#   sensitive = true
# }