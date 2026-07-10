# --------------------------------------------------------------------------
# Resource group
# --------------------------------------------------------------------------

resource "azurerm_resource_group" "sharepass" {
  name     = "rg-sharepass"
  location = "westeurope"
}
