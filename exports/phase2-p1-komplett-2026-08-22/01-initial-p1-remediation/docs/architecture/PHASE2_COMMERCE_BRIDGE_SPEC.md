# PHASE 2 — Commerce Bridge Specification

**Status:** APPROVED (Step 0.0 / BLK-P0-006 D-01)  
**Date:** 2026-08-22  
**Scope:** Read scaffold + honest write rejection until external commerce integration is connected

---

## Purpose

Provide a single read interface for domain workers (Product, Pricing, Stock, Order, Supplier) to access commerce data without bypassing security, audit, or approval policies.

Phase 2 ships a **read scaffold** that returns structured `NO_DATA_AVAILABLE` when no external commerce backend is connected. Writes return `EXTERNAL_INTEGRATION_PENDING`.

---

## Module

| Item | Value |
|------|-------|
| Path | `intelligence/buzzard_ai_complete/ai_core/bridge/commerce.py` |
| Class | `CommerceBridge` |
| Feature flag | `BUZZARD_AI_CORE_V2=1` (workers use bridge when enabled) |

---

## Read Operations

| Method | Input | Success | No integration |
|--------|-------|---------|----------------|
| `read_products(sku?)` | Optional SKU | Product records | `status: NO_DATA_AVAILABLE` |
| `read_orders(order_id?)` | Optional order ID | Order records | `status: NO_DATA_AVAILABLE` |
| `read_stock(sku?)` | Optional SKU | Stock levels | `status: NO_DATA_AVAILABLE` |

All responses include `integration: "commerce"` and a human-readable `message`.

---

## Write Operations

| Method | Behavior |
|--------|----------|
| `write(action, payload)` | Returns `status: EXTERNAL_INTEGRATION_PENDING` — no silent writes |

Writes require future integration approval workflow (Step 13).

---

## Security

- Bridge is **read-only** in Phase 2 foundation
- Workers must declare permissions before accessing bridge data
- No credentials stored in bridge module
- External credentials via environment / secret provider when integration is added

---

## Worker Usage

Domain workers (`product-intelligence`, `price-engine`, `stock-engine`, `order-engine`, `supplier-hub`) may call `CommerceBridge` when `BUZZARD_AI_CORE_V2=1`. When data is unavailable, workers return honest structured output — never synthetic commerce records.

---

## Future Integration (Step 13)

1. Connect to Buzzard commerce API / database via configured endpoint
2. Map responses to worker schemas
3. Enable write path behind approval policy
4. Add integration health to `/api/v1/integrations/status`

---

## Related Blockers

| Blocker | Resolution |
|---------|------------|
| BLK-P0-006 D-01 | This spec |
| BLK-P1-004 | Read scaffold implemented; writes pending external integration |
