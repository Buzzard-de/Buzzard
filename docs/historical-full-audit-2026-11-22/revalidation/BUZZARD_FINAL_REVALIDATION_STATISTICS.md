# Final revalidation statistics

Date: 22 November 2026.
HEAD: `63e55af5a367b8841b771d6e06be846369129009` on `cursor/close-three-finance-gaps-c293`.
Previous audit HEAD: `9b86c1b70159c32d644f2596f61ae8388ad401ec`.

## Record arithmetic

| | Old | New |
|--|--:|--:|
| VERIFIED_COMPLETE | 0 | 0 |
| COMPLETE_WITH_LIMITATIONS | 109 | 110 |
| PARTIAL | 30 | 38 |
| NOT_STARTED | 8 | 0 |
| BLOCKED_EXTERNAL | 55 | 54 |
| BLOCKED_AUTHORIZATION | 0 | 0 |
| BLOCKED_SECURITY | 0 | 0 |
| DUPLICATE | 7 | 7 |
| UNKNOWN_UNVERIFIED | 388 | 388 |
| Records | 597 | 597 |

New sum: 110 + 38 + 0 + 54 + 388 + 7 = 597.

Distinct tasks remain 590. Duplicate rows remain 7. 590 + 7 = 597.

## Movement

- Unchanged: 588
- Changed: 9
- Moved to PARTIAL from NOT_STARTED: 8
- Moved to COMPLETE_WITH_LIMITATIONS from BLOCKED_EXTERNAL: 1
- Newly VERIFIED_COMPLETE: 0
- New task ids: 0
- Still unknown: 388
- Still duplicate: 7

Changed ids: P21-T-16.1, S16-01, S16-06, MF-SUP-02, MF-TEX-01, MF-TEX-02, MF-SF-02, MF-MKTG-01, MF-MKTG-02

## Limited-complete recheck

109 rows were `COMPLETE_WITH_LIMITATIONS`. 86 of them cite paths this pass could open, and every one of those paths is still on disk. 23 cite no path this parser could open. Zero rows had all cited paths missing. None became `VERIFIED_COMPLETE`. One additional row, `P21-T-16.1`, entered this class from `BLOCKED_EXTERNAL`.

## Answers

1. Distinct historical tasks in the inventory: 590. Rows including 7 exact duplicates: 597. No new id was added.
2. Verified complete: 0.
3. Complete with limitations: 110.
4. Partial: 38.
5. Not started: 0. The previous 8 now have local code and remain short of product acceptance.
6. Waiting on an external blocker: 54.
7. Separate `BLOCKED_AUTHORIZATION` or `BLOCKED_SECURITY` rows: 0. All 54 remaining external rows also record a human-approval note. That note does not create a second status.
8. Unverified: 388.
9. Newly discovered tasks: 0.
10. Local closed paths that execute: sales lock, finance refusal, dry supplier forward, category audit, marketplace publish refusal, holiday draft, device-review cap, ad payload without a network call.
11. Code without a live connection: commerce engines, marketplace connectors, carrier adapters, payment providers, AI assistants, voice and realtime designs.
12. Document or plan only: Buzzard24 exports, Buzzard Film (no source module), Buzzard Bank as a product (only a local finance adapter).
13. Largest live blockers: sales locked, no live supplier or marketplace credentials, no tax or carrier connection, ports 3000 and 3001 not restarted, 321 unreviewed L2 labels, 388 tasks with no original acceptance line.
14. Movement since the previous audit: eight empty surfaces became local partials; sanctions screening no longer passes a prohibited party; finance writes stay refused while sales are locked. No live system was switched on.
15. Real completion: 0 of 590 distinct tasks are verified complete. 110 are complete only inside a local limit. The live product is not complete.
