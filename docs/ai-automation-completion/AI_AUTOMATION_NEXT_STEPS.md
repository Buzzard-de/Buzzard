# AI & Automation — Next Steps

This task finished the highest-priority coherent slice: Pusat core, memory, Guardian, approval, exceptions, specialist agents, fail-closed automations, targeted tests, and CI wiring.

It did **not** finish live providers, production verification, or sales-facing side effects.

## Exact continuation task (next agent)

Work on branch `cursor/ai-automation-completion-c293` (or a new `cursor/ai-automation-provider-c293` cut from it). Do not open sales or deploy.

1. **Authorized product write (dry-run first)**  
   Add a Pusat automation path that calls `productCore.createProduct` only when `authorizedWrite === true`, `dryRun === false`, and sales lock still forbids `ACTIVE`. Add a test that proves no ACTIVE transition.

2. **Process-restart memory proof**  
   Point `BUZZARD_DB_PATH` at a temp file, write memory, drop the module cache / spawn a child process, read the same row. Record the command in `AI_AUTOMATION_TEST_RESULTS.md`.

3. **Worker claim isolation**  
   Drive `claimAndExecute` against an `AI_TASK` job without stealing unrelated `QUEUED` rows (dedicated job type or filtered claim). Test graceful timeout of a running claim.

4. **Customs validator**  
   Implement `productValidator.validateCustoms` as a fail-closed normalizer (no legal claims) and re-enable the direct `customsAi.assessCustoms` path.

5. **Provider adapter (still stub-safe)**  
   If a key is present in the *local* environment, implement one provider behind a timeout and secret redaction. If no key, leave BLOCKED. Never log the key.

6. **Do not** implement €0.10 undercut in production pricing without an explicit pricing-engine change request and golden-price tests.

7. Recalculate `AI_AUTOMATION_COMPLETION_DATA.json` from the new evidence only.

## Operational troubleshooting (local)

```
npm run test:ai
node -e "const p=require('./server/lib/pusat'); p.getHealth().then(console.log)"
```

Health: `GET /api/health/pusat` (no secrets).  
Admin: `/api/admin/pusat/tasks`, `/api/admin/pusat/report`, `/api/admin/pusat/exceptions` (auth + permissions).

If tasks fail with `agent_unavailable`, run `pusat.agents.ensureSpecialistEmployees()`.  
If memory writes fail with `sensitive_field_rejected`, remove credential fields from the payload.  
If approvals sit in `PENDING`, decide via `/api/admin/approvals/:id/decide` — agents cannot self-approve.
