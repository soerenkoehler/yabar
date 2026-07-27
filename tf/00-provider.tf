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

  backend "azurerm" {
    use_azuread_auth = true
  }
}

provider "azurerm" {
  features {}

  # Keep Azure data-plane operations on Entra ID auth.
  storage_use_azuread = true
}

provider "azuread" {}

data "azurerm_client_config" "current" {}
