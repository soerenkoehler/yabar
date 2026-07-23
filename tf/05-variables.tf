variable "project_prefix" {
  type=string
}

variable "project_global_prefix" {
  type=string
}

variable "project_resource_group" {
  type=string
}

variable "auth_google_client_id" {
  type=string
  sensitive = true
}
