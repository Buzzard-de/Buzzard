# BUZZARD AI CORE — PHASE 3 RISK REGISTER

**Version:** 1.0  
**Date:** 2026-08-22

---

## Risk Matrix

| ID | Risk | Category | Probability | Impact | Severity | Mitigation | Owner | Detection | Recovery |
|----|------|----------|-------------|--------|----------|------------|-------|-----------|----------|
| R-001 | Commerce API not provisioned in time | Commerce | HIGH | CRITICAL | **P0** | Wave 1 gated on staging API; honest degradation until ready | Commerce platform team | Integration health check | Continue with NO_DATA_AVAILABLE; delay Wave 1 |
| R-002 | Unauthorized autonomous price change | AI/Security | MEDIUM | CRITICAL | **P0** | PricingPolicyEngine gate; no worker bypass; approval for out-of-bounds | AI Core team | Audit log monitoring; policy violation alerts | Rollback price via commerce API; halt price-engine |
| R-003 | Approval bypass via worker payload manipulation | Security | LOW | CRITICAL | **P0** | Orchestrator-only `approval_granted`; worker cannot set flag | AI Core team | Security tests; code review | Halt worker; security incident |
| R-004 | Duplicate order → duplicate supplier PO | Commerce | MEDIUM | HIGH | **P1** | Idempotency keys on all order/PO writes | AI Core team | Idempotency tests; reconciliation job | Cancel duplicate PO; reconcile |
| R-005 | Malicious supplier XML/CSV injection | Security | MEDIUM | HIGH | **P1** | Schema validation, size limits, content sanitization | AI Core team | Anomaly detection on feed data | Quarantine supplier feed; halt sync |
| R-006 | LLM prompt injection via customer service | AI/Security | MEDIUM | HIGH | **P1** | Input sanitization, output validation, no tool execution | AI Core team | LLM output schema validation | Escalate to human; block auto-response |
| R-007 | Credential theft (API tokens) | Security | LOW | CRITICAL | **P0** | Vault storage, rotation, no secrets in logs | DevOps | Secret scanning; access audit | Rotate credentials; revoke tokens |
| R-008 | Database migration failure in production | Technical | LOW | HIGH | **P1** | Alembic up/down tested in CI; backup before migration | DevOps | Migration monitoring | Alembic downgrade; restore from backup |
| R-009 | Stock data conflict across sources | Operational | HIGH | MEDIUM | **P2** | StockReconciler with supplier priority; conflict exceptions | AI Core team | Stale-data detection; reconciliation job | Manual resolution via exception workflow |
| R-010 | Storefront taxonomy misalignment (GAP-M-003) | External | HIGH | MEDIUM | **P2** | StorefrontTaxonomyBridge; document as external dep | Storefront team | Skipped test; mapping validation | Manual mapping until bridge complete |
| R-011 | Rate limit exceeded on commerce API | Commerce | MEDIUM | MEDIUM | **P2** | Respect Retry-After; circuit breaker; backoff | AI Core team | 429 response monitoring | Reduce sync frequency; queue requests |
| R-012 | GDPR violation via customer data exposure | Regulatory | LOW | CRITICAL | **P0** | Pseudonymization, data minimization, PII redaction from LLM | AI Core team | Audit log review; data access monitoring | Data breach protocol; erase affected records |
| R-013 | Worker registry scale (48+ category workers) | Technical | LOW | MEDIUM | **P3** | Dynamic provisioning; health check batching | AI Core team | Worker health endpoint latency | Optimize health checks; lazy registration |
| R-014 | In-process scheduler scale limit | Technical | MEDIUM | MEDIUM | **P2** | Distributed queue adapter in Wave 5 | AI Core team | Queue depth monitoring | Enable distributed queue |
| R-015 | Pricing policy misconfiguration | Financial | MEDIUM | HIGH | **P1** | Policy versioning; admin-only policy write; audit | Business ops | Margin anomaly alerts | Revert policy version; manual price review |
| R-016 | Unauthorized market data scraping | Regulatory | LOW | HIGH | **P1** | Compliant sources only; robots.txt respect; source whitelist | AI Core team | Source validation in market-intelligence worker | Halt market worker; review sources |
| R-017 | Phase 2 regression during Phase 3 development | Technical | MEDIUM | HIGH | **P1** | Phase 2 frozen; no modifications; full regression in CI | AI Core team | CI test failure | Revert Phase 3 change; fix in isolation |
| R-018 | JWT key compromise | Security | LOW | CRITICAL | **P0** | Key rotation; short expiry; vault storage | DevOps | Auth failure spike; security audit | Rotate keys; invalidate all tokens |
| R-019 | Event outbox backlog growth | Technical | MEDIUM | MEDIUM | **P2** | Dead letter queue; monitoring; backpressure | AI Core team | Outbox depth metric | Scale dispatcher; replay dead letters |
| R-020 | Supplier feed format change without notice | Supplier | HIGH | MEDIUM | **P2** | Schema validation; version detection; alert on validation failure | Supplier ops | Feed validation errors | Halt sync; contact supplier; update adapter |
| R-021 | Financial loss from auto-approved refund | Financial | LOW | CRITICAL | **P0** | All refunds require L5 approval; no auto-refund | AI Core team | Approval audit; refund amount monitoring | Reverse refund; halt returns worker |
| R-022 | EU VAT/tax miscalculation | Regulatory | MEDIUM | HIGH | **P1** | Country-specific tax rules in pricing engine; validation | Business ops | Tax anomaly reports | Manual correction; update tax rules |
| R-023 | Carrier API outage during fulfillment | Logistics | MEDIUM | MEDIUM | **P2** | Multi-carrier fallback; circuit breaker | Logistics team | Carrier health check | Switch carrier; manual fulfillment |
| R-024 | Decision engine produces incorrect recommendation | AI | MEDIUM | MEDIUM | **P2** | Confidence scoring; human review for LOW confidence; Kurmay validation | AI Core team | Decision audit; confidence monitoring | Override decision; retrain rules |
| R-025 | `init_ai_core_db()` in production (GAP-G-003) | Technical | LOW | MEDIUM | **P3** | Gate on `APP_ENV=production`; Alembic-only in prod | DevOps | Startup log check | Disable bootstrap; run Alembic |
| R-026 | Multilingual content quality degradation | Operational | MEDIUM | LOW | **P3** | Locale validation; human review for published content | Content team | Content quality metrics | Manual content review |
| R-027 | Integration adapter version mismatch | Technical | MEDIUM | MEDIUM | **P2** | Connector version tracking; contract tests | AI Core team | Contract test failure in CI | Pin adapter version; update connector |
| R-028 | Replay attack on webhook endpoints | Security | MEDIUM | HIGH | **P1** | HMAC verification, timestamp tolerance, nonce store | AI Core team | Duplicate event detection | Reject replayed events |
| R-029 | AI worker privilege escalation | Security | LOW | CRITICAL | **P0** | Immutable worker permissions; orchestrator enforcement | AI Core team | Permission tests; security review | Halt worker; security incident |
| R-030 | Demand forecasting inaccuracy | AI/Financial | HIGH | MEDIUM | **P2** | Deferred to Wave 5+; confidence intervals; human review | Business ops | Forecast vs actual monitoring | Disable auto-procurement based on forecast |

---

## Severity Summary

| Severity | Count | IDs |
|----------|-------|-----|
| **P0** | 7 | R-001, R-002, R-003, R-007, R-012, R-018, R-021, R-029 |
| **P1** | 10 | R-004, R-005, R-006, R-008, R-015, R-016, R-017, R-022, R-028 |
| **P2** | 10 | R-009, R-010, R-011, R-014, R-019, R-020, R-023, R-024, R-027, R-030 |
| **P3** | 3 | R-013, R-025, R-026 |

---

## Risk Acceptance

| Risk | Accepted? | Rationale |
|------|-----------|-----------|
| R-001 (Commerce API delay) | Conditional | Wave 1 gated; cannot proceed without staging API |
| R-010 (Storefront taxonomy) | Yes | External dependency; bridge designed; does not block Wave 1–3 |
| R-013 (Worker scale) | Yes | 48 workers manageable; optimization in P3 |
| R-025 (dev DB bootstrap) | Yes | P3 technical debt; gated in Wave 1 |
| R-030 (Demand forecasting) | Yes | Deferred to Wave 5+ by design |

---

**STOP — Risk monitoring not started.**
