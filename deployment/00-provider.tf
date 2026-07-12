terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.80"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 3.9"
    }
  }

  backend "azurerm" {}
}

provider "azurerm" {
  features {}
  # Disables provider-level fallback to key-based authentication for
  # storage data-plane operations performed by Terraform itself.
  storage_use_azuread = true
}

provider "azuread" {}

data "azurerm_client_config" "current" {}
