# BUZZARD AI CORE — PHASE 3 WAVE AUTHORITY

**Version:** 1.1 (post-P1 remediation)  
**Date:** 2026-08-22  
**Status:** AUTHORITATIVE — single source for wave placement  
**Supersedes:** Conflicting wave references in individual documents prior to P1 remediation

---

## Purpose

This document resolves all wave-placement contradictions identified in `PHASE3_ARCHITECTURE_VERIFICATION.md` (VF-P1-001 through VF-P1-005). All other Phase 3 architecture documents MUST align with this matrix.

---

## Authoritative Wave Matrix

| Wave | Objective | Autonomy | New Workers | Key Modules | External Gates |
|------|-----------|----------|-------------|-------------|----------------|
| **1** | Commerce Integration + Security Foundation | L0 | None (wire existing) | `CommerceIntegrationAdapter`, JWT middleware, idempotency, event outbox | Commerce API staging, JWT IdP (prod) |
| **2** | Supplier + Product Pipeline | L0–L1 | None (wire existing) | Supplier adapters, product pipeline, `StorefrontTaxonomyBridge` | Supplier feed ≥1 |
| **3** | Pricing + Stock + Order + Procurement Routing | L0–L2 | None (wire existing) | `PricingPolicyEngine`, `StockReconciler`, `OrderIngestionService`, `ProcurementRoutingService`, WMS/CRM adapters | WMS staging, CRM staging |
| **4** | Logistics + Returns + Market + Observability | L0–L3 | `logistics-intelligence`, `returns-intelligence`, `market-intelligence` | Carrier adapters, metrics exporter | Carrier API, market data API |
| **5** | Decision Engine + Autonomous L4 | L0–L4 | `decision-engine`, `procurement-intelligence` | `DecisionEngine`, `AutonomousActionEngine`, distributed queue (optional) | Production Commerce API (go-live) |

---

## Critical Path (authoritative)

```
Wave 1: JWT/RBAC + CommerceIntegrationAdapter + CommerceBridge live wiring
    ↓
Wave 2: Supplier Adapter Layer + Product Pipeline + Storefront bridge
    ↓
Wave 3: Pricing + Stock + Order intelligence + ProcurementRoutingService
    ↓
Wave 4: Logistics + Returns + Market Intelligence + Observability
    ↓
Wave 5: Business Decision Engine + Autonomous Action Engine L4 + procurement-intelligence worker
```

**Decision Engine is Wave 5 only.** Waves 1–4 produce signals and memory entries that feed the Decision Engine in Wave 5.

---

## External Dependency Gates (authoritative)

| Dependency | Blocks Wave | Module |
|------------|-------------|--------|
| Buzzard Commerce API (staging) | **1** | Commerce Integration Layer |
| JWT Identity Provider | **1** (production auth; bearer fallback for dev) | JWT middleware |
| LLM provider (production) | **1** | `LlmProviderAdapter` |
| Supplier feed (≥1) | **2** | Supplier Integration Layer |
| Storefront catalog mapping | **2** | `StorefrontTaxonomyBridge` (GAP-M-003) |
| WMS staging | **3** | `StockReconciler`, `WmsAdapter` |
| CRM staging | **3** | `CrmAdapter`, customer-service path |
| EU customs API | **3** | `customs-classifier` wiring |
| Carrier API (DHL, etc.) | **4** | Carrier Abstraction |
| Compliant market data API | **4** | Market Intelligence Layer |
| Production Commerce API | **5 / go-live** | `PHASE3_READY` |

**WMS is Wave 3, not Wave 2.** Supplier feeds (Wave 2) provide catalog data; WMS provides internal stock for reconciliation (Wave 3).

---

## Procurement Intelligence Split (VF-P1-005 resolution)

| Component | Wave | Type | Responsibility |
|-----------|------|------|----------------|
| `ProcurementRoutingService` | **3** | Domain service | PO routing, supplier selection logic, idempotency on PO creation; called by `order-engine` |
| `procurement-intelligence` worker | **5** | Worker | `supplier_selection`, `purchase_order_draft` tasks; elevated recommendations via Decision Engine |

Wave 3 delivers procurement **routing capability** in the order flow. Wave 5 registers the dedicated **worker** for autonomous procurement intelligence tasks.

---

## Module Classification Wave Assignment (authoritative)

| # | System | First Wave | Notes |
|---|--------|------------|-------|
| 1 | Commerce Integration Layer | 1 | |
| 2 | Supplier Integration Layer | 2 | |
| 3 | Product Intelligence | 2–3 | Pipeline Wave 2; publish Wave 3 |
| 4 | Pricing Intelligence | 3 | `PricingPolicyEngine` |
| 5 | Stock Intelligence | 3 | Requires WMS |
| 6 | Order Intelligence | 3 | |
| 7 | Customer Intelligence | 3 | CRM path |
| 8 | Market Intelligence | 4 | |
| 9 | Competitor Intelligence | 4 | Subset of market |
| 10 | Promotion Intelligence | 3 | Pricing engine extension |
| 11 | Margin Intelligence | 3 | Derived from pricing |
| 12 | Demand Forecasting | FUTURE | Wave 5+ foundation only |
| 13 | Procurement Intelligence | **3 (service) / 5 (worker)** | See split above |
| 14 | Logistics Intelligence | 4 | |
| 15 | Returns Intelligence | 4 | |
| 16 | Customer Service Intelligence | 3 | |
| 17 | Marketing Intelligence | FUTURE | |
| 18 | Analytics | 4 | |
| 19 | Business Decision Engine | **5** | |
| 20 | Autonomous Action Engine | **5** | |

---

## Migrations by Wave

| Wave | Migrations |
|------|------------|
| 1 | 008 (idempotency + events) |
| 2 | 009 (suppliers), 010 (products) |
| 3 | 011 (stock + orders) |
| 4 | 012 (decisions + policies), 013 (logistics + returns) |
| 5 | None (uses Wave 4 schema) |

---

## Cross-Reference

When any document references wave placement, it MUST match this file. Discrepancies are documentation defects.

**STOP — Implementation not started.**
