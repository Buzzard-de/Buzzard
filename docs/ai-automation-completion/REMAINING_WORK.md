# Remaining Work

## Required next slice (safe)

1. Observe GitHub Actions on PR #425 (`test:ai` job). Do not assume green.
2. Optionally run full `npm run test:unit` and record unrelated failures separately.
3. If a **non-production** LLM key is supplied, enable one provider behind timeout/redaction and `BUZZARD_AI_LIVE_PROBE=1` in a local-only session. Do not commit the key.
4. Implement `productValidator` golden tests for 35-market destination codes without claiming legal clearance.
5. Isolated `claimAndExecute` end-to-end on `AI_TASK` with a mock handler (no side effects) after draining or namespacing leftover jobs.

## Must not do without an explicit business request

- Open `BUZZARD_SALES_ENABLED`
- Activate Product SoT
- Create ACTIVE products
- Send real supplier POs
- Charge/refund real money
- Publish marketplace listings
- Add the €0.10 undercut rule
- Deploy to production

## Still BLOCKED until credentials exist

Live OpenAI/Anthropic/Google, remote Guardian/Orchestrator URLs, live supplier, Stripe, Twilio/email, carrier APIs, marketplace accounts, production probe.
