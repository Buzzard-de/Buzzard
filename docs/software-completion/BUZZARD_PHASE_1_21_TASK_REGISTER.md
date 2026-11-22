# Buzzard — Phase 1–21 remaining task register

**Checkpoint:** `9b86c1b7` on `cursor/save-full-worktree-c293`  
**Worktree:** `/home/ubuntu/buzzard-worktrees/save-full-worktree-c293`  
**PR:** #509, not merged  
**Phase 21 update:** 21.11.2026, 18:22 Avrupa/Berlin. Uncommitted.  
**Phase 10 update:** 21.11.2026, 18:53 Avrupa/Berlin. Uncommitted.  
**Workstream update:** 21.11.2026, 19:50 Avrupa/Berlin. Uncommitted.  
**T-15.2 update:** 21.11.2026, 21:35 Avrupa/Berlin. Uncommitted. The 30 locale pages were opened. The task stays open because category and country labels still mix languages, and the phase 15 gate still has `SF_BROWSER` as `NOT_RUN`.  
**T-15.2 close:** 21.11.2026, 22:23 Avrupa/Berlin. Uncommitted. The listed locale, textile, and country-selector checks passed in Chromium. `SF_BROWSER` is `PASS`. Phase 15 stays PARTIAL because `SF_LIVE_CDN` is blocked and `completeClaim` is false.  
**Rule:** A task is remaining until a test asserts the behavior. `percentComplete === 100` does not close a task. Phase 10 excludes `MKT_LIVE_PUBLISH`, phase 17 excludes `SEC_LIVE_RESTART`, phase 20 excludes `PERF_LOAD_TEST`, phase 21 excludes `E2E_PRODUCTION_RUN`, and phase 15 now excludes `SF_LIVE_CDN`, so a percent can read 100 without closing the blocked item. Phase 6 now uses the same rule for `ORD_LIVE_SUBMIT`.

## Local task updates

| ID | Outcome | Evidence |
|----|---------|----------|
| T-21.1 | Asserted in the worktree | `E2E_ORDER_AUTO` is absent. `E2E_AUTOMATION_EXECUTED` requires enqueue, deny, retry to `QUEUED`, and the same row after reopen |
| T-21.2 | Asserted in the worktree | `phase21Integration.test.mjs` checks the 13 workflow ids, each input and output, `captured` false, `moneyMoved` false, `sent` false, `refundIssued` false |
| T-21.3 | Open | `E2E_PRODUCTION_RUN` is `ok: false`, `BLOCKED_EXTERNAL` |
| T-10.1 | Asserted in the worktree | Registry ok requires 10 known channels, `channelCount` equal to that length, `anyLive` false, and `allBlocked` true. An empty array fails |
| T-10.2 | Asserted in the worktree | Invalid GTIN `123` is `ok: false`. Missing image is `IMAGE_MISSING`. The old `validation != null` check is gone |
| T-10.3 | Open | `MKT_LIVE_PUBLISH` is `ok: false`, `BLOCKED_EXTERNAL`. Armed credentials still return `HUMAN_APPROVAL_REQUIRED` |
| T-17.1 | Asserted in the worktree | `evaluateEgress("https://api.openai.com/v1/chat")` is `EXTERNAL_AI_EGRESS_DENIED`. Stripe, loopback, non-HTTPS, and userinfo are denied |
| T-17.2 | Asserted in the worktree | 21.11.2026 19:49 Avrupa/Berlin: jwt, esat, csrf, egress 42–45, admin session, and route-matrix files, 13 files, 308 tests, exit 0 |
| T-17.3 | Open | `SEC_LIVE_RESTART` stays false. Ports 3000 and 3001 were not restarted |
| T-11.1 | Asserted in the worktree | `PIM_SOT_PHASE3` is absent. Identity evidence reads `pim_core_products` and leaves `isSotActive()` false |
| T-11.2 | Asserted in the worktree | Incomplete product publish is `VALIDATION_FAILED`, not `PUBLISHED`. The `validation != null` pass is gone |
| T-8.1 | Asserted in the worktree | Complete fixture shipment is `HUMAN_GATE_REQUIRED` and `liveShipment` false. The OR with `ok === true` is gone |
| T-8.2 | Open | `LOG_LIVE_RATES` stays blocked. Quote total is `UNKNOWN` |
| T-9.1 | Asserted in the worktree | Work occasion returns workwear. Missing measurements return `NO_MEASUREMENTS`. Image adapter is `BLOCKED` |
| T-9.2 | Open | `TEX_LIVE_TRYON` stays blocked |
| T-15.1 | Asserted in the worktree | Empty device report has missing controls. `completeClaim === false` is not the success condition |
| T-15.2 | Asserted in the worktree for the listed storefront scope | 21.11.2026 22:22 Avrupa/Berlin: Chromium opened all 30 locales again after the label tables. First category, textile women and dress labels, and the selected country name matched that locale. No `Elbise` outside Turkish and no `Damenbekleidung` outside German. Arabic `rtl`, header width 375. No console or hydration error. 10 Playwright tests passed (9 commerce + the locale sweep), exit 0. The gate reads `docs/software-completion/t15-2/locales.json` and sets `SF_BROWSER` `PASS` only from that file. `completeClaim` stays false |
| T-20.1 | Asserted in the worktree | 20 samples of `searchAndSort` on 2,000 rows, 20 quotes, 20 sqlite counts, and one recovered queue task. Not a production measurement |
| T-20.2 | Open | `PERF_LOAD_TEST` stays blocked |

T-00 is evidenced for the seven phase files on this worktree. It is not a full-repository vitest run. T-01 stays open: phases 6, 7, 12, 13, 14, 16, 18, and 19 still assert `percentComplete === 100`. The 14:58 counts below are the earlier audit.

Priority: P0 blocks a true completion claim. P1 is a wrong or weak check. P2 is unfinished local work. P3 waits on an outside account and must stay locked.

## Verification gap (all phases)

| ID | Phase | Priority | Task | Depends on | Done when |
|----|------:|----------|------|------------|-----------|
| T-00 | 1–21 | P0 | Re-run the seven phase test files where `better-sqlite3` loads, with `BUZZARD_DB_PATH` on a temp file | Native module present; do not use `server/data/buzzard.db` | Done at 00:22 Avrupa/Berlin on 22.11.2026. Isolated `full.db`. Vitest 179 files, 2009 passed, 1 skipped, 0 failed, 155.81s. `part24` through `part35` stay excluded by `vitest.config.ts` |
| T-01 | 6–21 | P0 | Stop treating `percentComplete === 100` as the test | T-00 | Done at 22:55 Avrupa/Berlin for phases 6–21. Each gate asserts outputs and `completeClaim` stays false while its blocked id remains. A percent of 100 is still not completion |

## Phase tasks

| ID | Phase | Priority | Task | Depends on | Done when |
|----|------:|----------|------|------------|-----------|
| T-1.1 | 1 | P0 | Prove protected JSON hashes from files that are actually in the review, or stop requiring files that Git does not contain | A published baseline | Done at 00:13 Avrupa/Berlin on 22.11.2026. The seven protected files are gitignored and absent. `checkProtectedDataIntegrity` returns `ok: true`, `hashVerified: false`, and `ABSENT_IN_CLEAN_CHECKOUT`. A synthetic file matches only when its SHA-256 matches. 7 tests passed |
| T-1.2 | 1 | P1 | Confirm the running API, if any, loaded `jwtSecret.js` from `9b86c1b7` | Human window; do not restart ports in an audit | BLOCKED_EXTERNAL. Ports 3000 and 3001 must stay up. The running process was not restarted, so this worktree cannot prove which commit it loaded |
| T-1.3 | 1 | P2 | Dev-list “not FAILED” is not a functional test of each item | T-00 | Done at 00:55 Avrupa/Berlin on 22.11.2026. `devList51Items.test.mjs` has one behavior assertion for each of the 51 items. The phase-1 gate is `CORE_DEVLIST_EACH_ITEM`. Items 19, 20, 28, 30, 37, and 41 stay `LIVE_BLOCKED` |
| T-2.1 | 2 | P2 | L2 SEO copy is still out of scope and unfinished | Product copy | PARTIAL at 00:57 Avrupa/Berlin on 22.11.2026. A locale without its own string is `reviewed: false` and `fallbackFrom: "source"`. 9 of 330 L2 nodes have reviewed labels for every non-German locale. 321 do not. Those strings were not invented. The task stays open |
| T-2.2 | 2 | P1 | Re-run category gate after T-00 | T-00 | Done at 00:15 Avrupa/Berlin on 22.11.2026. The test asserts `automotive/bremssystem`, L1 50, and L2 330 directly. Phase 2 stays PARTIAL because L2 SEO copy is still open |
| T-3.1 | 3 | P0 | One product writer | Catalog decision | Done at 00:13 Avrupa/Berlin on 22.11.2026. `productService.recordCanonicalProduct` writes `pim_core_products`. PIM catalog, PIM30, catalog SEO, search, JSON import, and catalog sync call it first. Storefront preview, import JSON, and admin `productCore.getProduct` return that id. A blank SKU inserts nothing. A repeated SKU does not add a second core row |
| T-3.2 | 3 | P1 | Dry import must fail when the record is invalid | T-3.1 | Done at 00:15 Avrupa/Berlin on 22.11.2026. A valid dry record is accepted with `pimWrite: false`. A record with no EAN is rejected on the GTIN finding and is not catalogued. `PIM_LIVE_PUBLISH` stays BLOCKED_EXTERNAL. `completeClaim` is false |
| T-4.1 | 4 | P1 | Fix `SUP_SELECTION` operator precedence | None | Done at 00:15 Avrupa/Berlin on 22.11.2026. `selectionAccepted` requires `ok === true` and the XML fallback. A false `ok` with a fallback object is not accepted. `SUP_LIVE_API` stays BLOCKED_EXTERNAL |
| T-4.2 | 4 | P3 | Live supplier HTTP | Contract, egress still DENY until approved | A named test double is replaced by a credentialed call only after an explicit flag; default stays `networkBlocked` |
| T-5.1 | 5 | P1 | Price rules on more than one sample SKU | Catalog fixture | Done at 00:16 Avrupa/Berlin on 22.11.2026. The phase-5 test asserts automotive 11%, other 7%, drinks 15%, the €0.50 floor, the €0.10 undercut, and the loss block. `PRICE_LIVE_WRITE` stays BLOCKED_EXTERNAL |
| T-5.2 | 5 | P3 | Live price write | T-3.1 and sales still locked | No write path succeeds while `BUZZARD_SALES_ENABLED` is not fully armed |
| T-6.1 | 6 | P0 | One order writer | T-3.1 | Done at 23:41 Avrupa/Berlin. `orderService.recordCanonicalOrder` is the only commerce insert. OMS, cart checkout, `POST /api/orders`, and the dry orchestrator call it. Commercial inserts stay blocked while sales are off. A repeated idempotency key does not create a second row. Captured payment is refused |
| T-6.2 | 6 | P1 | HTTP rehearsal tested by calling the route | T-00, isolated DB | Done at 22:56 Avrupa/Berlin. `POST /api/orders/dry-rehearsal` on an ephemeral port returned 200, `rehearsal: true`, `live: false` for SKU `DRY-SKU-001`. The phase check still only sees that the route is registered |
| T-6.3 | 6 | P1 | `ORD_CANCEL_RULE` must not pass when there is no order id | T-6.2 | Done in the worktree at 22:23 Avrupa/Berlin. Empty id is `MISSING_ORDER_ID`. An unknown id is `ORDER_NOT_FOUND`. A tracked dry order still cancels |
| T-6.4 | 6 | P3 | Live supplier submit | T-4.2, sales locked | Submit returns disabled unless a human flag is on |
| T-7.1 | 7 | P1 | Keep capture and refund denied and test the denial by HTTP | T-00 | Done at 00:15 Avrupa/Berlin on 22.11.2026. Sandbox authorize has `captured: false`. `POST /api/payments-finance/intents/:id/confirm` returns 403 `PAYMENT_NOT_LIVE`. The refund route returns 403 `REFUND_NOT_LIVE`. No money moved. `PAY_LIVE_CAPTURE` stays BLOCKED_EXTERNAL |
| T-7.2 | 7 | P3 | PSP capture and money refund | Provider account | Still impossible while sales flags are off; no task closes this by a mock |
| T-8.1 | 8 | P1 | Shipment check must not accept both `ok === true` and a human gate as equal | None | Done in the worktree on 21.11.2026 19:50 Avrupa/Berlin. Expected code is `HUMAN_GATE_REQUIRED` |
| T-8.2 | 8 | P3 | Live carrier rates | Carrier account | `LOG_LIVE_RATES` stays false until credentials exist |
| T-9.1 | 9 | P2 | Textile recommendation covered by a fixture image, still not live | None | Done in the worktree. Workwear is returned and `liveTryOn` stays false |
| T-9.2 | 9 | P3 | Live try-on model | Vendor and egress approval | Not started |
| T-10.1 | 10 | P0 | Registry check must fail on an empty connector list | None | Done in the worktree on 21.11.2026 18:53 Avrupa/Berlin. Count is 10 and every channel is not live |
| T-10.2 | 10 | P0 | `validation != null` is not success | T-10.1 | Done in the worktree. Invalid GTIN and missing image fail `validateMarketplaceListing` |
| T-10.3 | 10 | P3 | Live marketplace publish | OAuth apps | Open. `MKT_LIVE_PUBLISH` stays false |
| T-11.1 | 11 | P0 | Remove the check that phase 3’s own percent is 100 | T-3.1 | Done in the worktree. Phase 11 reads `pim_core_products` and stays inactive |
| T-11.2 | 11 | P1 | Publish gate must require `ok === true` | T-11.1 | Done in the worktree. Incomplete publish is `VALIDATION_FAILED` |
| T-12.1 | 12 | P1 | Desk and inbound checks must not pass on any non-null object | None | Done at 22:55 Avrupa/Berlin. A weather question is not `order_status`. An order without an id is `UNVERIFIED_ORDER`. Blank desk and blank inbound are `EMPTY_INPUT` |
| T-12.2 | 12 | P3 | Live mailbox | IMAP/SMTP account | Queue stays local |
| T-13.1 | 13 | P1 | Council check must be the 17 expected ids, not `length > 0` | None | Done at 22:55 Avrupa/Berlin. Removing Sinan or Pusat fails the roster match. The specialist seed is 17 and includes both. The Kurmay roster is the full `MEMBERS` list, which is larger than 17 |
| T-13.2 | 13 | P3 | Live voice | Telephony account | Stays blocked |
| T-14.1 | 14 | P1 | Specialist test must invoke one gated refund and expect denial | T-00 | Done at 22:55 Avrupa/Berlin. `dispatch` of `CUSTOMER_REFUND` for Banu returns `HUMAN_GATE_REQUIRED` and `ok: false`. Count 17 is a separate check |
| T-14.2 | 14 | P3 | Live LLM council | Egress exception, still default DENY | No outbound call in the default test |
| T-15.1 | 15 | P1 | Device check must not require `completeClaim === false` as success | None | Done in the worktree. The pass is missing controls on an empty report |
| T-15.2 | 15 | P2 | Storefront specs on an isolated port, then one real page per locale without a mixed-language interface | Storefront on an isolated port | Done for the stated scope at 22:22 Avrupa/Berlin. 53 live main categories, the textile tree, and the 27 EU country names are localized. `SF_BROWSER` is `PASS`. Phase 15 stays PARTIAL because `SF_LIVE_CDN` is blocked |
| T-15.3 | 15 | P3 | CDN warm | Hosting | Not a software pass |
| T-16.1 | 16 | P0 | Sanctions predicate `ok \|\| blocked === false \|\| status != null` must be replaced | None | Done at 22:55 Avrupa/Berlin. A prohibited party is `LISTED_PARTY`. A missing list is `HUMAN_REVIEW`. An object with only `status: CLEARED` is not a pass |
| T-16.2 | 16 | P1 | Elster dry check must require `filed === false` and `live === false` together | None | Done at 22:55 Avrupa/Berlin. Dry ELSTER is `ELSTER_BLOCKED`, `filed` false, and `live` false together |
| T-16.3 | 16 | P3 | Tax Connect filing | Tax authority | Stays disconnected |
| T-17.1 | 17 | P0 | Egress check must deny a forbidden host, not merely see two objects | None | Done in the worktree. Forbidden AI host is `EXTERNAL_AI_EGRESS_DENIED` |
| T-17.2 | 17 | P1 | Run `jwtSecretHardening`, session, and route-matrix tests on this commit | T-00 | Done in the worktree on 21.11.2026 19:49 Avrupa/Berlin. 308 tests, exit 0 |
| T-17.3 | 17 | P2 | Live API reload | Human decision | Not done; do not restart 3000/3001 from an audit |
| T-18.1 | 18 | P1 | Campaign test must reject a publish attempt | None | Done at 22:55 Avrupa/Berlin. `publishCampaign` returns `PUBLISH_BLOCKED` and `published: false`. An unknown identity is `UNKNOWN_IDENTITY` |
| T-18.2 | 18 | P3 | Paid ads | Ad accounts | Stays blocked |
| T-19.1 | 19 | P1 | Admin snapshot test must read the HTTP admin route as a non-admin and expect denial | T-17.2 | Done at 22:55 Avrupa/Berlin. Anonymous `GET /api/admin/integrations` is 401. A catalog manager is 403. An administrator receives `salesEnabled: false` |
| T-19.2 | 19 | P3 | Production BI | Warehouse | Not a local JSON pass |
| T-20.1 | 20 | P1 | Replace the 2,000-row sort with a stated budget on the real search function and a database fixture | T-00 | Done in the worktree for a synthetic single process. Search p95 1.392 ms. Not production verification |
| T-20.2 | 20 | P3 | External load harness | Environment | Stays blocked until a harness exists |
| T-21.1 | 21 | P0 | Delete the `typeof auto === "boolean"` pass | None | Done in the worktree on 21.11.2026 18:22 Avrupa/Berlin. `E2E_AUTOMATION_EXECUTED` fails unless the queue ran, denied an unauthorized owner, recovered, and persisted |
| T-21.2 | 21 | P1 | Journey test asserts no payment capture and sales locked on the returned steps | T-6.1 | Done in the worktree. Workflow ids, inputs, outputs, sales lock, and no capture are asserted |
| T-21.3 | 21 | P3 | Production rehearsal | All P3 items above | Open. `E2E_PRODUCTION_RUN` stays false |

## Counts

| | |
|--|--:|
| Open at the 14:58 audit | 48 |
| Closed in the uncommitted phase 21 work | T-21.1, T-21.2 |
| Closed in the uncommitted phase 10 work | T-10.1, T-10.2 |
| Still open after phase 10 | 44, including T-10.3 and T-21.3 |
| Closed in the uncommitted 17/11/8/9/15/20 work | T-17.1, T-17.2, T-11.1, T-11.2, T-8.1, T-9.1, T-15.1, T-20.1 |
| Still open after that work | 36, including T-10.3, T-17.3, T-8.2, T-9.2, T-15.2, T-20.2, T-21.3 |
| Closed in the 22:23 Avrupa/Berlin locale and order run | T-15.2, T-6.3 |
| Still open after that run | 34, including T-10.3, T-17.3, T-8.2, T-9.2, T-15.3, T-20.2, T-21.3 |
| P0 still open | none in the task register |
| Closed in the 22:55 Avrupa/Berlin gate run | T-01, T-12.1, T-13.1, T-14.1, T-16.1, T-16.2, T-18.1, T-19.1, T-6.2 |
| Closed in the 23:41 Avrupa/Berlin order-writer run | T-6.1 |
| Still open after that run | 24, including T-3.1, T-7.1, T-10.3, T-15.3, T-17.3, T-20.2, T-21.3 |
| Closed in the 00:16 Avrupa/Berlin product-writer run on 22.11.2026 | T-3.1, T-1.1, T-2.2, T-3.2, T-4.1, T-5.1, T-7.1 |
| Still open after the 00:16 run | 21. Local: T-00, T-1.3, T-2.1. Blocked: T-1.2, T-17.3, and the 16 P3 rows |
| Closed at 00:22 Avrupa/Berlin on 22.11.2026 | T-00 |
| Still open | 20. Local: T-1.3, T-2.1. Blocked: T-1.2, T-17.3, and the 16 P3 rows |
| Closed at 00:55 Avrupa/Berlin on 22.11.2026 | T-1.3 |
| Still open after that run | 19. T-2.1 stays PARTIAL on missing L2 copy. Blocked: T-1.2, T-17.3, and the 16 P3 rows |
| Closed by the 14:58 audit | 0 |

## Do not close these by the current tests

The 19:50 run closed T-8.1, T-9.1, and T-20.1 for the local synthetic scope only. T-8.2, T-9.2, and T-20.2 stay open. Phases 12, 13, 14, 16, 18, and 19 no longer close on a percentage. Their blocked live checks stay open.

## Suggested order

1. T-1.3 is closed. Each of the 51 items has its own behavior assertion.  
2. T-2.1 stays PARTIAL. 321 of 330 L2 nodes have no reviewed non-German label. Do not invent that copy. T-1.2 and T-17.3 stay blocked because ports 3000 and 3001 must not be restarted.  
3. Leave every P3 item locked, including T-8.2, T-9.2, T-10.3, T-12.2, T-13.2, T-14.2, T-15.3, T-16.3, T-17.3, T-18.2, T-19.2, T-20.2, and T-21.3. Sales stays locked. Egress stays DENY. `productionReady` stays false. `live` stays false.
