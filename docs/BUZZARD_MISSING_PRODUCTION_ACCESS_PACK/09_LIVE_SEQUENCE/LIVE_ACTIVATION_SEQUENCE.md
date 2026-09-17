# FINAL LIVE ACTIVATION SEQUENCE

PHASE 1 — ACCESS
1. Configure Inter Cars production secret.
2. Configure read-only supplier access.
3. Run health/catalog/stock/price checks.

PHASE 2 — SUPPLIER
4. Run #342 controlled validation with Four-Eyes approval.
5. Record genuine supplier order reference.
6. Progress #343.
7. Progress #344.
8. Progress #345.
9. Progress #346 observation.

PHASE 3 — OTHER PROVIDERS
10. Configure payment provider.
11. Validate payment webhooks/status/refund capability.
12. Configure carrier.
13. Validate shipment/tracking capability.
14. Configure AI provider.
15. Validate AI production provider.
16. Configure returns/refund production dependencies.
17. Configure approved marketing providers.

PHASE 4 — FINAL
18. Run full production status.
19. Run final production gate.
20. Verify all mandatory evidence.
21. Keep SALES_ENABLED=0 if any mandatory item is not PASS.
22. Only explicit final approval may open sales.

No step may fabricate evidence.
