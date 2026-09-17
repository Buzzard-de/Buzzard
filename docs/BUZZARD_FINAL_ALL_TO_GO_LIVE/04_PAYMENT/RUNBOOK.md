PAYMENT PRODUCTION

Configure provider and production secret only through deployment secret manager. Verify intent/auth/capture/status, signed webhooks, idempotency, amount/currency validation, unknown-state handling and reconciliation. Never store raw card data or secrets. No real charges in CI/tests. Production payment remains disabled until explicit approval.
