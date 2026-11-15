# Test and security results

Ran in this environment (not CI live):

- `npx vitest run server/__tests__/masterCommand4.test.mjs server/__tests__/special16Phase4.test.mjs` — 22 passed
- `npx vitest run server/__tests__/remainingLocks.test.mjs` — 4 passed

Skipped (reason):

- Carrier / tax / voice provider sandboxes — no credentials
- Playwright full storefront — not re-run in this increment (MC3 already covered 30 locales)
- Production restore — forbidden
- Live egress packet capture on production — not this environment

Failed: none in the executed files.
