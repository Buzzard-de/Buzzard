# INTER CARS — ACCESS CHECKLIST

Required:
[ ] Inter Cars production API account
[ ] OAuth2 production token/access
[ ] Deployment Secret Manager entry
[ ] SUPPLIER_LIVE_PROFILE=inter-cars
[ ] Read-only network access
[ ] Health endpoint
[ ] Catalog endpoint
[ ] Stock endpoint
[ ] Price endpoint

Do NOT configure createOrder as validated manually.

After genuine read-only success:
run existing supplier controlled-live-validation gate.

Only then, with explicit Four-Eyes approval, run #342 CONTROLLED_VALIDATION.

CREATE_ORDER becomes VALIDATED only after a real accepted supplier response containing a genuine supplier order reference.

Unknown response = UNKNOWN_OUTCOME. Never blind retry.
