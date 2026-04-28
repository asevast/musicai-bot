# Terraform IaC for MusicAI on GCP
# SPEC §12 Stage 5, §14: Infrastructure as Code

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }

  backend "gcs" {
    bucket = "musicai-terraform-state"
    prefix = "musicai"
  }
}

locals {
  project_id = var.project_id
  region     = var.region
  prefix     = var.environment_prefix

  services = [
    "run.googleapis.com",
    "sql.googleapis.com",
    "redis.googleapis.com",
    "secretmanager.googleapis.com",
    "storage.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
  ]
}

# Enable APIs
resource "google_project_service" "services" {
  for_each = toset(local.services)
  service  = each.value
}

# GCS Bucket for storage
resource "google_storage_bucket" "storage" {
  name          = "${local.prefix}-musicai-storage"
  location      = local.region
  project       = local.project_id
  storage_class = "STANDARD"

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type = "Delete"
    }
  }

  depends_on = [google_project_service.services]
}

# Static website bucket
resource "google_storage_bucket" "webapp" {
  name     = "${local.prefix}-musicai-webapp"
  location = local.region
  project  = local.project_id

  website {
    main_page_suffix = "index.html"
    not_found_page   = "index.html"
  }

  cors {
    origin          = ["https://t.me"]
    method          = ["GET", "HEAD", "OPTIONS"]
    response_header = ["Content-Type"]
    max_age_seconds = 3600
  }

  depends_on = [google_project_service.services]
}

resource "google_storage_bucket_iam_binding" "webapp_public" {
  bucket = google_storage_bucket.webapp.name
  role   = "roles/storage.objectViewer"
  members = [
    "allUsers",
  ]
}

# Cloud SQL - PostgreSQL
resource "google_sql_database_instance" "main" {
  name             = "${local.prefix}-musicai-sql"
  database_version = "POSTGRES_15"
  region           = local.region
  project          = local.project_id

  settings {
    tier              = var.db_tier
    availability_type = var.environment == "prod" ? "REGIONAL" : "ZONAL"
    disk_size         = 20
    disk_autoresize   = true

    backup_configuration {
      enabled    = var.environment == "prod"
      start_time = "03:00"
    }

    maintenance_window {
      day  = 7
      hour = 3
    }

    ip_configuration {
      ipv4_enabled = false
      private_network = google_compute_network.vpc.id
    }

    insights_config {
      query_insights_enabled = true
    }
  }

  deletion_protection = var.environment == "prod"

  depends_on = [google_project_service.services]
}

resource "google_sql_database" "app" {
  name     = "musicai"
  instance = google_sql_database_instance.main.name
  project  = local.project_id
}

resource "google_sql_user" "app" {
  name     = "musicai"
  instance = google_sql_database_instance.main.name
  project  = local.project_id
  password = random_password.db_password.result
}

# Memorystore - Redis
resource "google_redis_instance" "main" {
  name               = "${local.prefix}-musicai-redis"
  tier               = var.redis_tier
  memory_size_gb     = 2
  region             = local.region
  project            = local.project_id
  authorized_network = google_compute_network.vpc.id

  redis_configs = {
    maxmemory-policy = "allkeys-lru"
  }

  depends_on = [google_project_service.services]
}

# VPC Network
resource "google_compute_network" "vpc" {
  name                    = "${local.prefix}-musicai-vpc"
  project                 = local.project_id
  auto_create_subnetworks = false
  routing_mode            = "GLOBAL"

  depends_on = [google_project_service.services]
}

resource "google_compute_subnetwork" "subnet" {
  name          = "${local.prefix}-musicai-subnet"
  project       = local.project_id
  region        = local.region
  network       = google_compute_network.vpc.id
  ip_cidr_range = "10.0.0.0/24"
  private_ip_google_access = true
}

# Service Account
resource "google_service_account" "app" {
  account_id   = "${local.prefix}-musicai-sa"
  display_name = "MusicAI Service Account"
  project      = local.project_id
}

resource "google_project_iam_member" "app_storage" {
  for_each = toset([
    "roles/storage.objectAdmin",
    "roles/cloudsql.client",
    "roles/secretmanager.secretAccessor",
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
  ])
  project = local.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.app.email}"
}

# Secrets
resource "random_password" "db_password" {
  length           = 32
  special          = false
}

resource "google_secret_manager_secret" "db_password" {
  secret_id = "${local.prefix}-db-password"
  project   = local.project_id

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "db_password" {
  secret  = google_secret_manager_secret.db_password.id
  version = "1"
  secret_data = random_password.db_password.result
}

# Cloud Run - API
resource "google_cloud_run_v2_service" "api" {
  name     = "${local.prefix}-api"
  location = local.region
  project  = local.project_id
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.app.email

    containers {
      image = "${local.region}-docker.pkg.dev/${local.project_id}/musicai/api:latest"

      env {
        name  = "PORT"
        value = "3000"
      }
      env {
        name  = "NODE_ENV"
        value = var.environment
      }
      env {
        name  = "DATABASE_URL"
        value = "postgresql://${google_sql_user.app.name}:${random_password.db_password.result}@/${google_sql_database.app.name}?host=/cloudsql/${local.project_id}:${local.region}:${google_sql_database_instance.main.name}"
      }
      env {
        name  = "REDIS_URL"
        value = "redis://${google_redis_instance.main.host}:${google_redis_instance.main.port}"
      }
      env {
        name  = "GCS_BUCKET_NAME"
        value = google_storage_bucket.storage.name
      }

      resources {
        limits = {
          cpu    = "2"
          memory = "1Gi"
        }
        cpu_idle = var.environment != "prod"
      }

      ports {
        container_port = 3000
      }
    }

    vpc_access {
      connector = google_vpc_access_connector.serverless.id
      egress    = "ALL_TRAFFIC"
    }

    max_instance_request_concurrency = 50
  }

  depends_on = [google_project_service.services]
}

# Cloud Run - Bot
resource "google_cloud_run_v2_service" "bot" {
  name     = "${local.prefix}-bot"
  location = local.region
  project  = local.project_id
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.app.email

    containers {
      image = "${local.region}-docker.pkg.dev/${local.project_id}/musicai/bot:latest"

      env {
        name  = "API_URL"
        value = google_cloud_run_v2_service.api.uri
      }
      env {
        name  = "DATABASE_URL"
        value = "postgresql://${google_sql_user.app.name}:${random_password.db_password.result}@/${google_sql_database.app.name}?host=/cloudsql/${local.project_id}:${local.region}:${google_sql_database_instance.main.name}"
      }
      env {
        name  = "REDIS_URL"
        value = "redis://${google_redis_instance.main.host}:${google_redis_instance.main.port}"
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        cpu_idle = true
      }
    }

    vpc_access {
      connector = google_vpc_access_connector.serverless.id
      egress    = "ALL_TRAFFIC"
    }
  }

  depends_on = [google_project_service.services]
}

# Cloud Run - Worker
resource "google_cloud_run_v2_service" "worker" {
  name     = "${local.prefix}-worker"
  location = local.region
  project  = local.project_id

  template {
    service_account = google_service_account.app.email

    containers {
      image = "${local.region}-docker.pkg.dev/${local.project_id}/musicai/worker:latest"

      env {
        name  = "DATABASE_URL"
        value = "postgresql://${google_sql_user.app.name}:${random_password.db_password.result}@/${google_sql_database.app.name}?host=/cloudsql/${local.project_id}:${local.region}:${google_sql_database_instance.main.name}"
      }
      env {
        name  = "REDIS_URL"
        value = "redis://${google_redis_instance.main.host}:${google_redis_instance.main.port}"
      }
      env {
        name  = "GCS_BUCKET_NAME"
        value = google_storage_bucket.storage.name
      }

      resources {
        limits = {
          cpu    = "2"
          memory = "4Gi"
        }
        cpu_idle = false
      }
    }

    vpc_access {
      connector = google_vpc_access_connector.serverless.id
      egress    = "ALL_TRAFFIC"
    }
  }

  depends_on = [google_project_service.services]
}

# VPC Connector for Cloud Run
resource "google_vpc_access_connector" "serverless" {
  name          = "${local.prefix}-serverless"
  region        = local.region
  project       = local.project_id
  network       = google_compute_network.vpc.id
  ip_cidr_range = "10.8.0.0/28"

  min_throughput = 200
  max_throughput = 400
}

# Artifact Registry
resource "google_artifact_registry_repository" "musicai" {
  location      = local.region
  repository_id = "musicai"
  format        = "DOCKER"
  project       = local.project_id
  description   = "MusicAI Docker images"

  depends_on = [google_project_service.services]
}

# Cloud Build Trigger
resource "google_cloudbuild_trigger" "main" {
  name     = "${local.prefix}-musicai-ci"
  project  = local.project_id
  filename = "cloudbuild.yaml"
  location = local.region

  github {
    owner = var.github_owner
    name  = var.github_repo
    push {
      branch = var.github_branch
    }
  }

  depends_on = [google_project_service.services]
}
