# PAYMENT PROVIDER ACCESS

Choose the actual payment provider used by Buzzard.

Required:
[ ] Merchant/business account
[ ] Production API credentials
[ ] Production webhook configuration
[ ] Webhook signing secret
[ ] Supported EUR and required market currencies
[ ] Refund capability
[ ] Deployment Secret Manager entry

Configure only secret references.

Run provider health/configuration validation.
Then controlled payment validation using provider-approved test/controlled mechanisms.

Never perform a real customer charge just to prove connectivity.
Never store card data.
