# Final Regression

Read-only safety regression over the locked production stack. It does not activate sales.

`createFinalRegressionManifest()` lists CORE through PRODUCTION_SAFETY groups, existing npm scripts, and 18 invariants.

`npm run test:final-regression` asserts:

- SoT owners remain exclusive
- Pusat / AI / supplier / marketplace cannot write SoT
- Go-Live stays BLOCKED
- activation does not flip `BUZZARD_SALES_ENABLED`
- `BaseSupplierAdapter.ordersEnabled === false`
- tax and shipping remain dry-run

Expected locked safety: PRODUCT_SOT_ACTIVE OFF, SALES LOCKED, supplier orders OFF, payment OFF, marketplace write OFF, production writes NOT_EXECUTED.

`GO_LIVE_READINESS=BLOCKED` is expected safety, not a regression failure.
