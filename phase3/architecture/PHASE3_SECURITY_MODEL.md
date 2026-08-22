# BUZZARD AI CORE — PHASE 3 SECURITY MODEL

**Version:** 1.0  
**Date:** 2026-08-22

---

## 1. Security Principles

1. **Fail closed** — deny by default; EsatBey gate at VALIDATING (inherited)
2. **Least privilege** — workers, services, and users get minimum required permissions
3. **Defense in depth** — API auth + worker permissions + memory namespace guards + approval gates
4. **No silent execution** — high-risk actions always require human approval
5. **Audit everything** — all security-relevant events logged with correlation IDs
6. **Honest degradation** — no fake connectivity or synthetic security passes

---

## 2. Authentication

### Phase 2 (frozen)

- Bearer token / `X-API-Key` via `BUZZARD_API_TOKEN`
- Role from `BUZZARD_API_TOKEN_ROLES` map or `X-Actor-Role` header
- 503 if token unset

### Phase 3 (production)

| Method | Use Case | Wave |
|--------|----------|------|
| JWT (RS256) | Human users, admin UI | Wave 1 |
| API key (hashed) | Service-to-service, adapters | Wave 1 |
| mTLS | Enterprise supplier connections | Wave 3+ |
| OAuth 2.0 | Third-party integrations | Future |

JWT claims:

```json
{
  "sub": "user@buzzard.de",
  "roles": ["operator", "approver"],
  "categories": ["bz.01", "bz.15"],
  "suppliers": ["supplier-abc"],
  "iat": 1692000000,
  "exp": 1692003600,
  "iss": "buzzard-ai-core"
}
```

Backward compatibility: flat bearer token continues to work when `BUZZARD_JWT_ENABLED=false`.

---

## 3. Authorization

### RBAC (Role-Based Access Control)

Roles and permissions defined in `PHASE3_PERMISSION_MATRIX.md`. Enforced at:

1. **API middleware** — request rejected before handler (Wave 1)
2. **WorkerExecutor** — permission check at execution (Phase 2, preserved)
3. **PolicyEngine** — namespace write, approval, risk review (Phase 2, extended)
4. **MemoryService** — namespace guard on write (Phase 2, preserved)

### ABAC (Attribute-Based Access Control)

Applied where role alone is insufficient:

| Attribute | Enforcement Point |
|-----------|-------------------|
| `risk_level` | Orchestrator REVIEW gate |
| `action_value_eur` | Approval threshold |
| `category_id` | Category-manager scope |
| `supplier_id` | Procurement scope |
| `data_residency` | Customer data access |
| `locale` | Content access restrictions |

---

## 4. Worker Security

| Control | Implementation |
|---------|----------------|
| Worker identity | Each worker has fixed `worker_id`; cannot impersonate |
| Permission frozenset | Declared at registration; checked by `WorkerExecutor` |
| No direct DB access | Workers use services injected via `WorkerContext` |
| No direct HTTP to external | Workers use bridge/adapter interfaces only |
| Timeout enforcement | `WorkerExecutor` thread-pool timeout |
| Halt on CRITICAL | `ExceptionService` halts worker; resume on RESOLVED |
| Output validation | Schema validation on `WorkerResult.output` |

**Privilege escalation prevention:** Workers cannot modify their own permissions, create tasks with `approval_granted=True`, or write to `security/` namespace.

---

## 5. Secret Management

| Secret | Storage | Rotation |
|--------|---------|----------|
| `BUZZARD_API_TOKEN` | Environment / vault | 90 days |
| `COMMERCE_API_TOKEN` | Environment / vault | Per commerce platform policy |
| `LLM_API_KEY` | Environment / vault | Per provider policy |
| Supplier credentials | Per-supplier encrypted in `ai_core_supplier_credentials` | Per supplier agreement |
| JWT signing key | Vault / KMS | 365 days |
| Webhook HMAC secrets | Per-integration in DB | On compromise |

Secrets never appear in: logs, memory namespaces, worker output, audit records, or error messages.

---

## 6. Encryption

| Data | At Rest | In Transit |
|------|---------|------------|
| Database | PostgreSQL TDE or disk encryption | TLS 1.2+ |
| API traffic | N/A | TLS 1.2+ (HTTPS) |
| Supplier credentials | AES-256 encrypted column | TLS |
| Customer PII | Pseudonymized; encrypted at rest | TLS |
| Audit logs | Encrypted storage | TLS |

---

## 7. Network Security

| Control | Detail |
|---------|--------|
| API rate limiting | Existing middleware; per-token and per-IP (Phase 2) |
| Integration egress | Allowlist outbound domains per adapter |
| Webhook ingress | HMAC verification, IP allowlist optional |
| Internal services | Service mesh or private network (deploy config) |
| CORS | Restricted to known admin UI origins |

---

## 8. Data Isolation

| Boundary | Mechanism |
|----------|-----------|
| Memory namespaces | `PolicyEngine.can_write_namespace()` |
| Customer data | Pseudonymized `customer_ref` hash; no raw PII in worker output |
| Supplier data | Scoped to `suppliers/{id}/` namespace |
| Category data | Scoped to `categories/{bz_id}/` |
| Tenant (future) | `tenant_id` column on all tables; query filter |

---

## 9. Threat Model

| Threat | Vector | Mitigation | Severity |
|--------|--------|------------|----------|
| **Prompt injection** | LLM input via customer service | Input sanitization, output validation, no tool execution from LLM | HIGH |
| **Tool abuse** | Worker calling unauthorized integrations | Permission frozenset, adapter interface boundary | HIGH |
| **Privilege escalation** | Worker modifying permissions or approval state | Immutable permissions, orchestrator-only approval_granted | CRITICAL |
| **Data leakage** | Memory namespace cross-access | PolicyEngine namespace guards | HIGH |
| **Malicious supplier data** | XML/CSV injection, XSS in descriptions | Schema validation, sanitization, size limits | HIGH |
| **Malicious product content** | HTML/JS in product descriptions | Content sanitizer before storage | MEDIUM |
| **API compromise** | Stolen token | JWT expiry, rotation, rate limiting, audit | CRITICAL |
| **Credential theft** | Env var exposure | Vault, no secrets in logs | CRITICAL |
| **Replay attack** | Duplicate webhook/API call | Idempotency keys, nonce store, timestamp check | HIGH |
| **Duplicate execution** | Retry creating duplicate PO/order | Idempotency keys on all writes | HIGH |
| **Unauthorized autonomous action** | Decision engine bypassing approval | Decision engine cannot execute writes; approval gate enforced | CRITICAL |
| **Rate limit bypass** | Distributed attack | Per-IP + per-token limits, WAF (deploy) | MEDIUM |
| **SQL injection** | API input | SQLAlchemy ORM, parameterized queries | LOW (ORM) |
| **Supply chain attack** | Compromised supplier feed | Validation, anomaly detection, manual review gate | HIGH |

---

## 10. Audit Requirements

Every security-relevant event logged to `ai_core_audit_log`:

| Event | Fields |
|-------|--------|
| Authentication success/failure | actor, method, ip, correlation_id |
| Authorization denial | actor, resource, action, reason |
| Approval granted/rejected | actor, task_id, decision, note |
| Worker execution | worker_id, task_id, risk_level, result |
| Integration call | integration_id, direction, status_code |
| Memory write (HIGH impact) | namespace, key, actor, impact |
| Exception created (SECURITY) | type, severity, worker_id |
| Policy violation | policy_id, violation, actor |

Retention: indefinite for security events; configurable for operational events.

---

## 11. Approval Security

| Rule | Enforcement |
|------|-------------|
| Approver cannot be task creator | `PolicyEngine` checks actor ≠ created_by |
| Separation of duties | Financial approvals require different role than creator |
| Approval timeout | Configurable; auto-reject after TTL |
| Rejection audit | Full rejection reason logged |
| No self-approval | `commerce_write` creator cannot approve own task |

---

## 12. LLM Security

| Control | Detail |
|---------|--------|
| Input boundary | Customer request text only; no system prompt injection from user input |
| Output validation | Response schema validation before storage |
| No tool calling | LLM cannot invoke workers or APIs directly |
| PII redaction | Customer PII stripped from LLM context |
| Rate limiting | Per-customer LLM call limits |
| Audit | All LLM calls logged with token count, model, latency |

---

## 13. Compliance

| Requirement | Approach |
|-------------|----------|
| GDPR | Customer pseudonymization, data minimization, right to erasure API |
| EU product safety | Compliance flags on products; block publish if non-compliant |
| VAT/tax | Country-specific rules in pricing engine |
| Audit trail | Immutable audit log for financial and security events |
| Data residency | Configurable per deployment region |

---

**STOP — Security implementation not started.**
