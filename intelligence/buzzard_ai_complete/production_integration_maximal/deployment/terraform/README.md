Terraform production layer contract:
- DNS zone
- HTTPS certificate
- compute/container service
- managed PostgreSQL
- Redis/cache
- object storage for exports/backups
- secret manager
- monitoring/alerts
- least-privilege IAM

Provider-specific resources are intentionally not hard-coded without the selected
cloud/provider account and region.
