# Buzzard AI – Complete Architecture Tree

agents/
  dogu_bey/       Intelligence / OSINT
  aslan_bey/      Müsteşar / orchestration
  esat_bey/       Defensive security
  protocols/      Agent contracts
  router/         Agent routing
  registry/       Agent registry

core/             Shared runtime
config/            Configuration
database/          Database, repositories, migrations, seeds
memory/            Long-term memory, embeddings, retention, knowledge graph
research/          Crawling, parsing, normalization, deduplication, scheduling
sources/           Source catalog, provenance and source policies
verification/      Cross-source verification, conflict and scoring
tasks/             Queue, workflow, retry and dependency management
reports/           Templates, export and citations
security/          Auth, RBAC, audit, incidents, policies, sandbox and keys
api/               Routes, middleware, schemas, dependencies, webhooks, versioning
models/             Shared data contracts
integrations/      LLM, search, database, email, storage, analytics, ERP/ecommerce
monitoring/         Logging, tracing, alerts, dashboards, health
tests/              Unit, integration, security, performance and fixtures
scripts/            Migration, backup, restore, maintenance and development
deploy/             Docker/Compose, Kubernetes, Nginx, backup and observability
docs/               Architecture, agents, API, security, operations, deployment,
                    research, memory, testing, compliance and runbooks
data/               Raw, processed and archived data
logs/               Runtime logs
