# --------------------------------------------------------------------------
# Resource group
# --------------------------------------------------------------------------

resource "azurerm_resource_group" "sharepass" {
  name     = "${var.project_resource_group}"
  location = "westeurope"
}
