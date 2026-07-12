# --------------------------------------------------------------------------
# Resource group
# --------------------------------------------------------------------------

resource "azurerm_resource_group" "sharepass" {
  name     = "${vars.project_resource_group}"
  location = "westeurope"
}
