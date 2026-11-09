# Acceptance gates (MC14)

1. Working: census load, mock adapter, selection HOLD, webhook unit, returns mock, DE country flag.  
2. Mock-only: rates, tracking events, returns labels, order sim.  
3. Parcel independently verified: **0**.  
4. Local/regional independently verified: **0** (class rows exist).  
5. Last-mile independently verified: **0**.  
6. Own fleet independently verified: **0**.  
7. Subcontractor independently verified: **0**.  
8. Postcode data acquired (ingested): **0/27**.  
9. Real carrier coverage verified countries: **0**.  
10. Official API docs: **17**.  
11. Adapters implemented (shared mock): **1** framework covering catalog; MOCK_TESTED brands **3**.  
12. Mock-tested adapters: **3**.  
13. Sandbox tests successful: **0**.  
14. Germany pilot: MOCK/CODE_READY, not SANDBOX, not LIVE.  
15. Missing: contracts, sandbox creds, licensed postcode ingest, human approval.  
16. Smart selection: HOLD with UNKNOWN coverage/price/ETA.  
17. Supplier/carrier split: code ready; edges empty.  
18. Tracking/returns: mock + mapping; no live notify.  
19. Customs/Tax: hold design; no live declaration.  
20. Security: HMAC webhook, TLS on, no secret values, sales lock.  
21. Completed countries: **0**.  
22. Partial: USP named + register layers (most).  
23. Blocked: HU, PT, LT, RO (+ AT SPA, postcode ingest).  
24. Live usable carriers today: **0**.  
25. Remaining: contracts, sandbox, independent service evidence, postcode ingest, licensed coverage, human-gated live.
