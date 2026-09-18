INTER CARS CONTROLLED LIVE

Use existing #334-#347 and #342. Configure genuine OAuth2 credentials only through deployment secrets. Never put credentials in git, SQLite, logs, UI or AI.

First: read-only health/catalog/stock/price. Then #342 CONTROLLED_VALIDATION only with explicit human/four-eyes approval, scope, expiry, nonce, payload hash and idempotency. CREATE_ORDER becomes VALIDATED only after a genuine accepted supplier response with a real supplier order reference.

Unknown outcome = UNKNOWN_OUTCOME; never blind retry. Production order network stays OFF until the exact gate authorizes it.
