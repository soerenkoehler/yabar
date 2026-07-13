# --------------------------------------------------------------------------
# Resource group
# --------------------------------------------------------------------------

data "azurerm_resource_group" "sharepass" {
  name     = "${var.project_resource_group}"
}
