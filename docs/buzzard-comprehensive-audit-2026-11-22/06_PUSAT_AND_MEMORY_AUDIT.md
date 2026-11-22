# Pusat and memory

Date: 22 November 2026, 21:40 Europe/Berlin for the test run. HEAD `63e55af5`.

## Ten answers

| # | Question | Result | Evidence |
|---|---|---|---|
| 1 | Can Pusat route a task? | Yes, locally | `server/lib/pusat/orchestrator.js` `executeTask` calls `dispatch` with `assigneeId`. Test: `pusatOrchestrator.test.mjs` PRICE_CALCULATE. |
| 2 | Can one AI hand work to another? | Yes, as a queued assignee and a research row | Orchestrator dependency test waits for the parent. `durable.js` `requestResearch` stored a Pusat topic and it was readable after reopen. |
| 3 | Can it check a result? | Yes, locally | `verifyDispatch` runs before `complete`. |
| 4 | Can it detect a bad result? | Yes, for the coded checks | Failed verification calls `queue.fail`. Live claims are rejected. |
| 5 | Can it recall a past task? | Yes for the orchestrator SQLite queue in tests | `persistent approval resume` reopened the queue and still refused a stock buy. |
| 6 | Is memory durable? | Split | `putMemory` writes `pusat_memories`. `createMemoryStore` is an in-memory Map and dies with the process. |
| 7 | Can retrieval return a stored fact? | Yes | This audit wrote `{sku: AUDIT-1}` and read it back through a new connection. Council test also keeps personal memory private. |
| 8 | Does human approval stop a live action? | Yes | Stock buy stays `HUMAN_GATE_REQUIRED` and `purchased: false`. |
| 9 | Are unauthorized tasks refused? | Yes | `decideApproval` allows only `human` and `operator`. Another owner read returned `PERSONAL_MEMORY_DENIED`. |
| 10 | Does a restart keep state? | Queue tests say yes. Memory file reopen said yes. A full server process restart was not performed. | Ports 3000 and 3001 were not restarted. |

## Local tests run in this audit

Synthetic data only. Database file `/tmp`, deleted after the run.

| Test | Result |
|---|---|
| Save a fact, open a new SQLite connection, read it | 3 rows recalled, including the fact |
| Save a task result and read it later | `task_result` value `dry-ok` present |
| Pass a research topic from Pusat | Row status COMPLETED, verification UNVERIFIED because no dated source was supplied |
| Store two conflicting values for the same key | Both values returned. No conflict code exists |
| Another agent reads the first agent's memory | `PERSONAL_MEMORY_DENIED` |

## Limits

- `PUSAT_RUNTIME_ENABLED` must be `1` for several `executeReadOnly` actions. Default is off.
- `orch_audit` is written. A public read API for that audit table was not found.
- There are two meeting implementations: an in-memory one and SQLite meeting tables.
- Council tests state `llmCouncil: false`. This is a rule router, not a live model council.
- Confidence: high for the local tests above. The production process was not restarted, so production durability is UNKNOWN.

TASK ID: PUSAT-LOCAL
TASK NAME: Pusat local orchestration
MODULE: AI orchestrator
STATUS: COMPLETE_WITH_LIMITATIONS
CODE EVIDENCE: `orchestrator.js`, `durableTaskQueue.js`, `durable.js`
TEST EVIDENCE: 11 orchestrator tests and 6 council tests passed in this pass
LIVE INTEGRATION: Not connected
MISSING COMPONENTS: Live model routing, process-restart proof on the production database, memory conflict handling
EXTERNAL DEPENDENCIES: None for the local path
RISK LEVEL: P2
RECOMMENDED ACTION: Do not rebuild the local router. Add a conflict rule only after a human defines which fact wins.
CONFIDENCE: High for the local path.
