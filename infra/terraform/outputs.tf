output "api_url" {
  description = "URL of the API Cloud Run service"
  value       = google_cloud_run_v2_service.api.uri
}

output "bot_url" {
  description = "URL of the Bot Cloud Run service"
  value       = google_cloud_run_v2_service.bot.uri
}

output "worker_url" {
  description = "URL of the Worker Cloud Run service"
  value       = google_cloud_run_v2_service.worker.uri
}

output "database_connection_name" {
  description = "Cloud SQL connection name"
  value       = google_sql_database_instance.main.connection_name
}

output "database_host" {
  description = "PostgreSQL host (use with Cloud SQL Proxy)"
  value       = "/cloudsql/${google_sql_database_instance.main.connection_name}"
}

output "redis_host" {
  description = "Redis host"
  value       = google_redis_instance.main.host
}

output "redis_port" {
  description = "Redis port"
  value       = google_redis_instance.main.port
}

output "storage_bucket" {
  description = "GCS bucket for track storage"
  value       = google_storage_bucket.storage.name
}

output "webapp_bucket" {
  description = "GCS bucket for webapp static files"
  value       = google_storage_bucket.webapp.name
}

output "service_account_email" {
  description = "Service account email for app deployments"
  value       = google_service_account.app.email
}

output "artifact_registry_repository" {
  description = "Docker repository URL"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.musicai.repository_id}"
}
