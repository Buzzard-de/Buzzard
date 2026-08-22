# Phase 3 Architecture — Document Index

**Package version:** 1.0  
**Date:** 2026-08-22  
**Classification:** Architecture design only

---

## Authoritative Documents (read in order)

| # | Document | Role |
|---|----------|------|
| 1 | `README.md` | Package overview and principles |
| 2 | `PHASE3_ARCHITECTURE.md` | Master architecture — layers, purpose, module classification |
| 3 | `PHASE3_DEPENDENCY_MAP.md` | Layer and module dependency graph |
| 4 | `PHASE3_DATA_FLOW.md` | End-to-end data and control flows |
| 5 | `PHASE3_INTEGRATION_ARCHITECTURE.md` | Commerce, supplier, carrier, external systems |
| 6 | `PHASE3_WORKER_SPEC.md` | Phase 3 worker extensions and new workers |
| 7 | `PHASE3_PERMISSION_MATRIX.md` | RBAC, ABAC, approval roles |
| 8 | `PHASE3_SECURITY_MODEL.md` | Threat model, controls, identity |
| 9 | `PHASE3_AUTONOMY_MODEL.md` | Autonomy levels 0–5, action classification |
| 10 | `PHASE3_DATABASE_ARCHITECTURE.md` | Schema evolution, migrations 008+ |
| 11 | `PHASE3_API_ARCHITECTURE.md` | REST API surface, versioning, contracts |
| 12 | `PHASE3_EVENT_ARCHITECTURE.md` | Events, commands, queues, idempotency |
| 13 | `PHASE3_TEST_STRATEGY.md` | Quality gates, test types |
| 14 | `PHASE3_IMPLEMENTATION_PLAN.md` | Implementation waves (no code) |
| 15 | `PHASE3_RISK_REGISTER.md` | Risk matrix |
| 16 | `PHASE3_FINAL_REVIEW.md` | Formal review summary |
| 17 | `PHASE3_ARCHITECTURE_FINAL_REVIEW.md` | **Authoritative** final review and decision |

---

## Upstream References (frozen — do not modify)

| Document | Location |
|----------|----------|
| Phase 2 Baseline Freeze | `docs/PHASE2_BASELINE_FREEZE.md` |
| Phase 2 Final Verification V4 | `docs/PHASE2_FINAL_VERIFICATION_V4.md` |
| Phase 2 Gap Analysis | `docs/PHASE2_V2_GAP_ANALYSIS.md` |
| Phase 2 Architecture (design) | `docs/buzzard-ai-core/PHASE2_ARCHITECTURE.md` |
| Phase 2 Worker Spec | `docs/buzzard-ai-core/PHASE2_WORKER_SPEC.md` |
| Phase 2 Data Flow | `docs/buzzard-ai-core/PHASE2_DATA_FLOW.md` |
| Phase 2 Permission Matrix | `docs/buzzard-ai-core/PHASE2_PERMISSION_MATRIX.md` |
| Phase 1 Final Verification | `exports/phase1-final-verification-2026-08-22/` |

---

## Cross-Reference Matrix

| Topic | Primary Doc | Supporting Docs |
|-------|-------------|-----------------|
| Commerce API strategy | `PHASE3_INTEGRATION_ARCHITECTURE.md` | `PHASE3_DATA_FLOW.md`, `PHASE3_API_ARCHITECTURE.md` |
| Supplier feeds | `PHASE3_INTEGRATION_ARCHITECTURE.md` | `PHASE3_DATA_FLOW.md`, `PHASE3_WORKER_SPEC.md` |
| Category intelligence | `PHASE3_ARCHITECTURE.md` L4 | `PHASE3_WORKER_SPEC.md`, `PHASE3_PERMISSION_MATRIX.md` |
| Pricing engine | `PHASE3_ARCHITECTURE.md` L5 | `PHASE3_AUTONOMY_MODEL.md`, `PHASE3_DATA_FLOW.md` |
| Business decisions | `PHASE3_ARCHITECTURE.md` | `PHASE3_AUTONOMY_MODEL.md`, `PHASE3_EVENT_ARCHITECTURE.md` |
| Security | `PHASE3_SECURITY_MODEL.md` | `PHASE3_PERMISSION_MATRIX.md` |
| Database | `PHASE3_DATABASE_ARCHITECTURE.md` | `PHASE3_IMPLEMENTATION_PLAN.md` |
| Testing | `PHASE3_TEST_STRATEGY.md` | `PHASE3_IMPLEMENTATION_PLAN.md` |
| Risks | `PHASE3_RISK_REGISTER.md` | `PHASE3_ARCHITECTURE_FINAL_REVIEW.md` |

---

## Known Documentation Conflicts (documented, not silently changed)

| Conflict | Resolution |
|----------|------------|
| Export snapshot says Phase 2 not started | **Live baseline** (`docs/PHASE2_BASELINE_FREEZE.md`) is authoritative |
| Design doc worker ID `kurmay-synthesis` vs implemented `kurmay` | Phase 3 uses **implemented IDs**; alias layer optional in Wave 1 |
| Design doc `esat-bey-security` vs implemented `security-ai` | Phase 3 uses **implemented IDs** |
| Storefront `cat-{nn}` vs master `bz.{nn}` | Documented in integration architecture; GAP-M-003 external |
| Category count varies across legacy docs (43/47/50) | **TaxonomyRegistry.main_category_count()** is sole authority |
