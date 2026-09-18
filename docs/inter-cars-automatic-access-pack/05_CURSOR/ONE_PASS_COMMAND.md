# Cursor One-Pass Command

Read all files in this pack and inspect the existing Buzzard code first.

Integrate existing SSOT modules; do not rebuild #337–#348.

Implement/connect only what is necessary for:
1. secure production credential-reference detection
2. Inter Cars Stage A read-only automation
3. #342 controlled CreateOrder readiness/execution
4. metadata-only evidence
5. admin visibility
6. audit
7. restart/idempotency/recovery
8. safety gates
9. final status reporting

Keep these commands working:
npm run status:missing-production-access
npm run status:final-closure
npm run final:operations-check
npm run gate:supplier-production-validation
npm run gate:supplier-controlled-live-validation

If repository conventions allow, add:
npm run inter-cars:production-preflight
This command must never send CreateOrder.

Run:
npm run typecheck
npm run lint
npm run build
npm run security:check
and all relevant supplier-production regression gates.

If real credentials are absent, live actions must be SKIPPED/BLOCKED, never fake-success.

Final report:
SOFTWARE
CREDENTIAL
STAGE_A
#342
SUPPLIER_ORDER
REAL_SIDE_EFFECTS
FAKE_EVIDENCE
FINAL_STATUS

Real credentials are supplied outside Git through Secret Manager. Never request or expose the secret value.
