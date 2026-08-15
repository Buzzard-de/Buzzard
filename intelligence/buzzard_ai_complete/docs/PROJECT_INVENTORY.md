# Buzzard AI – Gesamt-Inventar

This is the single consolidated project root.

## Structure
The project contains all planned extension directories for:
agents, database, memory, research, sources, verification, tasks, reports,
security, API, integrations, monitoring, configuration, deployment, tests,
scripts and documentation.

## Important
A directory existing in this package is an architectural extension point.
It does NOT mean that every external integration or production service is
already implemented.

## External dependencies that must be configured in a real deployment
- LLM provider and credentials
- lawful search/web provider and credentials
- production database
- secret manager
- email/notification provider
- object storage if required
- observability backend
- HTTPS/reverse proxy
- backup storage
- deployment environment

No secrets are included.
