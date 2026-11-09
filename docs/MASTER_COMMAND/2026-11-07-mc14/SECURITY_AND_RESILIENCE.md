# Security and resilience

Existing: least privilege policy names, webhook HMAC, replay, idempotency module, audit log, TLS not disabled, egress allowlist not expanded, secrets names-only.

Adapter: retry metadata CODE_READY_MOCK; circuit OPEN on injected outage; external payloads untrusted.

Not production-proven: encryption-at-rest for logistics PII, backup of logistics volumes, live rate-limit against carrier APIs.

Guardian sqlite not touched.
