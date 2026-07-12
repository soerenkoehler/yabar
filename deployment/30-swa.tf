# --------------------------------------------------------------------------
# Static Web App (Free tier)
# --------------------------------------------------------------------------

# resource "azurerm_static_web_app" "sharepass" {
#   name                = "swa-sharepass"
#   resource_group_name = azurerm_resource_group.sharepass.name
#   location            = azurerm_resource_group.sharepass.location

#   sku_tier = "Free"
#   sku_size = "Free"

#   # Optional: link the app to a repository for CI/CD-driven deployment.
#   # repository_url, repository_branch, and repository_token must be
#   # supplied together if this is used.
#   # repository_url    = "https://github.com/<owner>/<repo>"
#   # repository_branch = "main"
#   # repository_token  = var.repository_token
# }

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