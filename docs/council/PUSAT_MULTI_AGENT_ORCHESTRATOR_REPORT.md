# Pusat Multi-Agent Orchestrator

Code: `server/lib/buzzardNative/core/taskRouter.js`.  
Pusat action: `MULTI_AGENT_FOUNDATION` in `server/lib/pusat/runtime.js` (read-only, `PUSAT_RUNTIME_ENABLED=1`).

Example local task “research payments locally”:

1. CREATE
2. ASSIGN dogu_bey, sinan_bey, esat_bey
3. IN_PROGRESS rule-think per assignee
4. REVIEW_REQUIRED then APPROVAL_REQUIRED
5. completed=false; forceComplete → HUMAN_GATE_REQUIRED

Pusat cannot: mark COMPLETED, open private memory, skip Esat egress, pay, or verify research as truth.

Restart: `snapshot()` + `createRouter({ seed })` restored the same task state in-process.

States implemented: CREATED, ASSIGNED, IN_PROGRESS, WAITING, BLOCKED, REVIEW_REQUIRED, APPROVAL_REQUIRED, COMPLETED, FAILED. COMPLETED is never auto-set.
