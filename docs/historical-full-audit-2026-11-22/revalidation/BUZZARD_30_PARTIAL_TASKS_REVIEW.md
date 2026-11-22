# 30 partial tasks — revalidation

HEAD `63e55af5`.

L2 yeniden sayım: 330 düğüm, 30 dilin her birinde incelenen etiket 9. Eksik incelenen düğüm 321. `completeClaim` false. Almanca kaynak adları yedek olarak duruyor; incelenen paket onları bitmiş çeviri saymıyor.

### P21-T-2.1
1. Numara: T-2.1
2. Ad: L2 SEO copy is still out of scope and unfinished
3. Açıklama: PARTIAL at 00:57 Avrupa/Berlin on 22.11.2026. A locale without its own string is `reviewed: false` and `fallbackFrom: "source"`. 9 of 330 L2 nodes have reviewed labels for every non-German locale. 321 do not. Those strings were not invented. The task stays open
4. Kaynak: docs/software-completion/BUZZARD_PHASE_1_21_TASK_REGISTER.md
5. Modül: phase 2
6. Dosyalar: docs/software-completion/BUZZARD_PHASE_1_21_TASK_REGISTER.md
7. Kod durumu: PARTIAL at 00:57 Avrupa/Berlin on 22.11.2026. A locale without its own string is `reviewed: false` and `fallbackFrom: "source"`. 9 of 330 L2 nodes have reviewed labels for every non-German locale. 321 do not. Those strings were not invented. The task stays open
8. Test durumu: server/__tests__/phases6to21Gate.test.mjs and the test named in the register
9. Entegrasyon: Local software only where closed. Live rows stay blocked.
10. Son bilinen kayıt: 2026-11-22; bu denetimin HEAD değeri 63e55af5.
11. Önceki durum: PARTIAL
12. Güncel durum: PARTIAL
13. Eksik kanıt: PARTIAL at 00:57 Avrupa/Berlin on 22.11.2026. A locale without its own string is `reviewed: false` and `fallbackFrom: "source"`. 9 of 330 L2 nodes have reviewed labels for every non-German locale. 321 do not. Those strings were not invented. The task stays open
14. Sonuç: PARTIAL. Kanıt dosyası bu turda yeniden yürütülmedi; çelişen yeni kanıt yoksa eski sınıf korundu.

### S16-02
1. Numara: 2
2. Ad: AB-27 cargo and logistics
3. Açıklama: 27-country carriers, compare rates/SLA, B2B/retail, API/XML/CSV/webhook, label, track, address, returns, Pusat.
4. Kaynak: docs/MASTER_COMMAND/SPECIAL_16_TASKS.json
5. Modül: AB-27 cargo and logistics
6. Dosyalar: 
7. Kod durumu: server/lib/commerce/ab27Logistics.js; server/lib/logisticsFulfillment.js (separate).
8. Test durumu: ['server/__tests__/ab27Commerce.test.mjs']
9. Entegrasyon: BLOCKED
10. Son bilinen kayıt: 2026-11-01; bu denetimin HEAD değeri 63e55af5.
11. Önceki durum: PARTIAL
12. Güncel durum: PARTIAL
13. Eksik kanıt: ['Carrier credentials from operator']
14. Sonuç: PARTIAL. Kanıt dosyası bu turda yeniden yürütülmedi; çelişen yeni kanıt yoksa eski sınıf korundu.

### S16-03
1. Numara: 3
2. Ad: Sanctions and trade compliance
3. Açıklama: EU/UN/DE sources; product, origin, transit, buyer, supplier, end user, dual-use; hold + human review.
4. Kaynak: docs/MASTER_COMMAND/SPECIAL_16_TASKS.json
5. Modül: Sanctions and trade compliance
6. Dosyalar: ['server/lib/commerce/sanctionsScreen.js']
7. Kod durumu: ab27Logistics.screenTrade; pusat_trade_holds.
8. Test durumu: ['server/__tests__/special16Phase4.test.mjs']
9. Entegrasyon: BLOCKED
10. Son bilinen kayıt: 2026-11-01; bu denetimin HEAD değeri 63e55af5.
11. Önceki durum: PARTIAL
12. Güncel durum: PARTIAL
13. Eksik kanıt: ['Live official lists after mandate']
14. Sonuç: PARTIAL. Kanıt dosyası bu turda yeniden yürütülmedi; çelişen yeni kanıt yoksa eski sınıf korundu.

### S16-12
1. Numara: 12
2. Ad: Application and acceptance tests
3. Açıklama: Per-item unit, integration, security, live verification recorded separately. Do not mark complete on failed tests.
4. Kaynak: docs/MASTER_COMMAND/SPECIAL_16_TASKS.json
5. Modül: Application and acceptance tests
6. Dosyalar: 
7. Kod durumu: server/__tests__/*; scorecard.js
8. Test durumu: 
9. Entegrasyon: NOT_STARTED
10. Son bilinen kayıt: 2026-11-01; bu denetimin HEAD değeri 63e55af5.
11. Önceki durum: PARTIAL
12. Güncel durum: PARTIAL
13. Eksik kanıt: ['T-ACCEPT']
14. Sonuç: PARTIAL. Kanıt dosyası bu turda yeniden yürütülmedi; çelişen yeni kanıt yoksa eski sınıf korundu.

### S16-13
1. Numara: 13
2. Ad: Independent capabilities (no Claude)
3. Açıklama: No Claude/Claude Code integration. Rebuild useful general skills in Buzzard-owned code. Respect IP.
4. Kaynak: docs/MASTER_COMMAND/SPECIAL_16_TASKS.json
5. Modül: Independent capabilities (no Claude)
6. Dosyalar: 
7. Kod durumu: independentCapabilities.js; aiProviders.js
8. Test durumu: ['server/__tests__/ecosystemSecurity.test.mjs']
9. Entegrasyon: NOT_STARTED
10. Son bilinen kayıt: 2026-11-01; bu denetimin HEAD değeri 63e55af5.
11. Önceki durum: PARTIAL
12. Güncel durum: PARTIAL
13. Eksik kanıt: ['Owned capability stubs']
14. Sonuç: PARTIAL. Kanıt dosyası bu turda yeniden yürütülmedi; çelişen yeni kanıt yoksa eski sınıf korundu.

### S16-14
1. Numara: 14
2. Ad: Cursor continuous maintenance
3. Açıklama: Detect/fix, security updates, deps, test, docs. Isolated workspaces. Verify Cursor limits.
4. Kaynak: docs/MASTER_COMMAND/SPECIAL_16_TASKS.json
5. Modül: Cursor continuous maintenance
6. Dosyalar: 
7. Kod durumu: docs/MASTER_COMMAND/*; export Cursor packages.
8. Test durumu: 
9. Entegrasyon: NOT_STARTED
10. Son bilinen kayıt: 2026-11-01; bu denetimin HEAD değeri 63e55af5.
11. Önceki durum: PARTIAL
12. Güncel durum: PARTIAL
13. Eksik kanıt: ['SOP file']
14. Sonuç: PARTIAL. Kanıt dosyası bu turda yeniden yürütülmedi; çelişen yeni kanıt yoksa eski sınıf korundu.

### S16-16
1. Numara: 16
2. Ad: Business continuity and DR
3. Açıklama: Finish 3-2-1-1-0; local+offsite verify; real immutable; clean restore; integrity; RPO/RTO; ransomware/loss/region drills; Esat notify. Backup ≠ recovery.
4. Kaynak: docs/MASTER_COMMAND/SPECIAL_16_TASKS.json
5. Modül: Business continuity and DR
6. Dosyalar: 
7. Kod durumu: copies32110.js; offsiteCopy.js; proveBackupRestore.js.
8. Test durumu: ['server/__tests__/survivalCopies32110.test.mjs']
9. Entegrasyon: BLOCKED
10. Son bilinen kayıt: 2026-11-01; bu denetimin HEAD değeri 63e55af5.
11. Önceki durum: PARTIAL
12. Güncel durum: PARTIAL
13. Eksik kanıt: ['Operator vault + T-32110']
14. Sonuç: PARTIAL. Kanıt dosyası bu turda yeniden yürütülmedi; çelişen yeni kanıt yoksa eski sınıf korundu.

### MC16-05
1. Numara: 5
2. Ad: Voice and messaging
3. Açıklama: Messaging CODE_READY (not E2E). Voice BLOCKED — no SIP/STT/TTS.
4. Kaynak: docs/MASTER_COMMAND/MASTER_TASKS.json
5. Modül: Voice and messaging
6. Dosyalar: 
7. Kod durumu: Messaging CODE_READY (not E2E). Voice BLOCKED — no SIP/STT/TTS.
8. Test durumu: Not re-run in this audit
9. Entegrasyon: Messaging CODE_READY (not E2E). Voice BLOCKED — no SIP/STT/TTS.
10. Son bilinen kayıt: 2026-11-01; bu denetimin HEAD değeri 63e55af5.
11. Önceki durum: PARTIAL
12. Güncel durum: PARTIAL
13. Eksik kanıt: Messaging CODE_READY (not E2E). Voice BLOCKED — no SIP/STT/TTS.
14. Sonuç: PARTIAL. Kanıt dosyası bu turda yeniden yürütülmedi; çelişen yeni kanıt yoksa eski sınıf korundu.

### MC16-08
1. Numara: 8
2. Ad: Full production test matrix
3. Açıklama: New unit tests run. Full e2e/load/payment/live DR not run.
4. Kaynak: docs/MASTER_COMMAND/MASTER_TASKS.json
5. Modül: Full production test matrix
6. Dosyalar: 
7. Kod durumu: New unit tests run. Full e2e/load/payment/live DR not run.
8. Test durumu: Not re-run in this audit
9. Entegrasyon: New unit tests run. Full e2e/load/payment/live DR not run.
10. Son bilinen kayıt: 2026-11-01; bu denetimin HEAD değeri 63e55af5.
11. Önceki durum: PARTIAL
12. Güncel durum: PARTIAL
13. Eksik kanıt: New unit tests run. Full e2e/load/payment/live DR not run.
14. Sonuç: PARTIAL. Kanıt dosyası bu turda yeniden yürütülmedi; çelişen yeni kanıt yoksa eski sınıf korundu.

### INC-backup_restore_test
1. Numara: backup_restore_test
2. Ad: backup_restore_test
3. Açıklama: scripts/db-backup dry docs
4. Kaynak: data/master/buzzard_incomplete_checklist.v1.json
5. Modül: items
6. Dosyalar: scripts/db-backup dry docs
7. Kod durumu: scripts/db-backup dry docs
8. Test durumu: scripts/db-backup dry docs
9. Entegrasyon: 
10. Son bilinen kayıt: 2026-11-19; bu denetimin HEAD değeri 63e55af5.
11. Önceki durum: PARTIAL
12. Güncel durum: PARTIAL
13. Eksik kanıt: Orijinal kabul ölçütü yok.
14. Sonuç: PARTIAL. Kanıt dosyası bu turda yeniden yürütülmedi; çelişen yeni kanıt yoksa eski sınıf korundu.

### INC-global_error_recovery
1. Numara: global_error_recovery
2. Ad: global_error_recovery
3. Açıklama: supplierErrorRecovery.js
4. Kaynak: data/master/buzzard_incomplete_checklist.v1.json
5. Modül: items
6. Dosyalar: supplierErrorRecovery.js
7. Kod durumu: supplierErrorRecovery.js
8. Test durumu: supplierErrorRecovery.js
9. Entegrasyon: 
10. Son bilinen kayıt: 2026-11-19; bu denetimin HEAD değeri 63e55af5.
11. Önceki durum: PARTIAL
12. Güncel durum: PARTIAL
13. Eksik kanıt: Orijinal kabul ölçütü yok.
14. Sonuç: PARTIAL. Kanıt dosyası bu turda yeniden yürütülmedi; çelişen yeni kanıt yoksa eski sınıf korundu.

### INC-scheduler_queue_ha
1. Numara: scheduler_queue_ha
2. Ad: scheduler_queue_ha
3. Açıklama: automationHealth.js
4. Kaynak: data/master/buzzard_incomplete_checklist.v1.json
5. Modül: items
6. Dosyalar: automationHealth.js
7. Kod durumu: automationHealth.js
8. Test durumu: automationHealth.js
9. Entegrasyon: 
10. Son bilinen kayıt: 2026-11-19; bu denetimin HEAD değeri 63e55af5.
11. Önceki durum: PARTIAL
12. Güncel durum: PARTIAL
13. Eksik kanıt: Orijinal kabul ölçütü yok.
14. Sonuç: PARTIAL. Kanıt dosyası bu turda yeniden yürütülmedi; çelişen yeni kanıt yoksa eski sınıf korundu.

### MF-ORD-01
1. Numara: MF-ORD-01
2. Ad: Unified order management (single SoT)
3. Açıklama: `orderManagementOrchestrator.js` only imported by `phase6OrderManagement.js`; checkout uses `ordersPlugin.js` / `orderService`
4. Kaynak: BUZZARD_MISSING_FEATURES_MASTER_LIST.md
5. Modül: ORD
6. Dosyalar: `orderManagementOrchestrator.js` only imported by `phase6OrderManagement.js`; checkout uses `ordersPlugin.js` / `orderService`
7. Kod durumu: `orderManagementOrchestrator.js` only imported by `phase6OrderManagement.js`; checkout uses `ordersPlugin.js` / `orderService`
8. Test durumu: List is an audit claim. Not re-executed here.
9. Entegrasyon: `orderManagementOrchestrator.js` only imported by `phase6OrderManagement.js`; checkout uses `ordersPlugin.js` / `orderService`
10. Son bilinen kayıt: 2026-11-17; bu denetimin HEAD değeri 63e55af5.
11. Önceki durum: PARTIAL
12. Güncel durum: PARTIAL
13. Eksik kanıt: `orderManagementOrchestrator.js` only imported by `phase6OrderManagement.js`; checkout uses `ordersPlugin.js` / `orderService`
14. Sonuç: PARTIAL. Kanıt dosyası bu turda yeniden yürütülmedi; çelişen yeni kanıt yoksa eski sınıf korundu.

### MF-ORD-02
1. Numara: MF-ORD-02
2. Ad: Idempotent production order pipeline
3. Açıklama: Dry journey only; no cross-engine idempotency test across DB + JSON
4. Kaynak: BUZZARD_MISSING_FEATURES_MASTER_LIST.md
5. Modül: ORD
6. Dosyalar: Dry journey only; no cross-engine idempotency test across DB + JSON
7. Kod durumu: Dry journey only; no cross-engine idempotency test across DB + JSON
8. Test durumu: List is an audit claim. Not re-executed here.
9. Entegrasyon: Dry journey only; no cross-engine idempotency test across DB + JSON
10. Son bilinen kayıt: 2026-11-17; bu denetimin HEAD değeri 63e55af5.
11. Önceki durum: PARTIAL
12. Güncel durum: PARTIAL
13. Eksik kanıt: Dry journey only; no cross-engine idempotency test across DB + JSON
14. Sonuç: PARTIAL. Kanıt dosyası bu turda yeniden yürütülmedi; çelişen yeni kanıt yoksa eski sınıf korundu.

### MF-INV-01
1. Numara: MF-INV-01
2. Ad: Single inventory SoT
3. Açıklama: `inventoryIntegration`, `wmsInventory`, `fulfillmentStore` parallel
4. Kaynak: BUZZARD_MISSING_FEATURES_MASTER_LIST.md
5. Modül: INV
6. Dosyalar: `inventoryIntegration`, `wmsInventory`, `fulfillmentStore` parallel
7. Kod durumu: `inventoryIntegration`, `wmsInventory`, `fulfillmentStore` parallel
8. Test durumu: List is an audit claim. Not re-executed here.
9. Entegrasyon: `inventoryIntegration`, `wmsInventory`, `fulfillmentStore` parallel
10. Son bilinen kayıt: 2026-11-17; bu denetimin HEAD değeri 63e55af5.
11. Önceki durum: PARTIAL
12. Güncel durum: PARTIAL
13. Eksik kanıt: `inventoryIntegration`, `wmsInventory`, `fulfillmentStore` parallel
14. Sonuç: PARTIAL. Kanıt dosyası bu turda yeniden yürütülmedi; çelişen yeni kanıt yoksa eski sınıf korundu.

### MF-PRI-01
1. Numara: MF-PRI-01
2. Ad: Live price publish to storefront
3. Açıklama: Loss block in dry-run; live write `PRICE_LIVE_WRITE` blocked in phase 5
4. Kaynak: BUZZARD_MISSING_FEATURES_MASTER_LIST.md
5. Modül: PRI
6. Dosyalar: Loss block in dry-run; live write `PRICE_LIVE_WRITE` blocked in phase 5
7. Kod durumu: Loss block in dry-run; live write `PRICE_LIVE_WRITE` blocked in phase 5
8. Test durumu: List is an audit claim. Not re-executed here.
9. Entegrasyon: Loss block in dry-run; live write `PRICE_LIVE_WRITE` blocked in phase 5
10. Son bilinen kayıt: 2026-11-17; bu denetimin HEAD değeri 63e55af5.
11. Önceki durum: PARTIAL
12. Güncel durum: PARTIAL
13. Eksik kanıt: Loss block in dry-run; live write `PRICE_LIVE_WRITE` blocked in phase 5
14. Sonuç: PARTIAL. Kanıt dosyası bu turda yeniden yürütülmedi; çelişen yeni kanıt yoksa eski sınıf korundu.

### MF-PIM-01
1. Numara: MF-PIM-01
2. Ad: Product SoT consolidation
3. Açıklama: `productSot.js` → `productCore`; legacy `productStore`, `productCatalogPim` plugins remain
4. Kaynak: BUZZARD_MISSING_FEATURES_MASTER_LIST.md
5. Modül: PIM
6. Dosyalar: `productSot.js` → `productCore`; legacy `productStore`, `productCatalogPim` plugins remain
7. Kod durumu: `productSot.js` → `productCore`; legacy `productStore`, `productCatalogPim` plugins remain
8. Test durumu: List is an audit claim. Not re-executed here.
9. Entegrasyon: `productSot.js` → `productCore`; legacy `productStore`, `productCatalogPim` plugins remain
10. Son bilinen kayıt: 2026-11-17; bu denetimin HEAD değeri 63e55af5.
11. Önceki durum: PARTIAL
12. Güncel durum: PARTIAL
13. Eksik kanıt: `productSot.js` → `productCore`; legacy `productStore`, `productCatalogPim` plugins remain
14. Sonuç: PARTIAL. Kanıt dosyası bu turda yeniden yürütülmedi; çelişen yeni kanıt yoksa eski sınıf korundu.

### MF-PIM-02
1. Numara: MF-PIM-02
2. Ad: Live search index
3. Açıklama: `catalogSearchSort` — `liveIndex: false` in phase 20 check
4. Kaynak: BUZZARD_MISSING_FEATURES_MASTER_LIST.md
5. Modül: PIM
6. Dosyalar: `catalogSearchSort` — `liveIndex: false` in phase 20 check
7. Kod durumu: `catalogSearchSort` — `liveIndex: false` in phase 20 check
8. Test durumu: List is an audit claim. Not re-executed here.
9. Entegrasyon: `catalogSearchSort` — `liveIndex: false` in phase 20 check
10. Son bilinen kayıt: 2026-11-17; bu denetimin HEAD değeri 63e55af5.
11. Önceki durum: PARTIAL
12. Güncel durum: PARTIAL
13. Eksik kanıt: `catalogSearchSort` — `liveIndex: false` in phase 20 check
14. Sonuç: PARTIAL. Kanıt dosyası bu turda yeniden yürütülmedi; çelişen yeni kanıt yoksa eski sınıf korundu.

### MF-CAT-01
1. Numara: MF-CAT-01
2. Ad: Filters on live catalog DB
3. Açıklama: In-memory sort tests; storefront bridge not exhaustively audited
4. Kaynak: BUZZARD_MISSING_FEATURES_MASTER_LIST.md
5. Modül: CAT
6. Dosyalar: In-memory sort tests; storefront bridge not exhaustively audited
7. Kod durumu: In-memory sort tests; storefront bridge not exhaustively audited
8. Test durumu: List is an audit claim. Not re-executed here.
9. Entegrasyon: In-memory sort tests; storefront bridge not exhaustively audited
10. Son bilinen kayıt: 2026-11-17; bu denetimin HEAD değeri 63e55af5.
11. Önceki durum: PARTIAL
12. Güncel durum: PARTIAL
13. Eksik kanıt: In-memory sort tests; storefront bridge not exhaustively audited
14. Sonuç: PARTIAL. Kanıt dosyası bu turda yeniden yürütülmedi; çelişen yeni kanıt yoksa eski sınıf korundu.

### MF-LOG-02
1. Numara: MF-LOG-02
2. Ad: Label generation (live)
3. Açıklama: `carrierContract.createShipment` → `HUMAN_GATE_REQUIRED`
4. Kaynak: BUZZARD_MISSING_FEATURES_MASTER_LIST.md
5. Modül: LOG
6. Dosyalar: `carrierContract.createShipment` → `HUMAN_GATE_REQUIRED`
7. Kod durumu: `carrierContract.createShipment` → `HUMAN_GATE_REQUIRED`
8. Test durumu: List is an audit claim. Not re-executed here.
9. Entegrasyon: `carrierContract.createShipment` → `HUMAN_GATE_REQUIRED`
10. Son bilinen kayıt: 2026-11-17; bu denetimin HEAD değeri 63e55af5.
11. Önceki durum: PARTIAL
12. Güncel durum: PARTIAL
13. Eksik kanıt: `carrierContract.createShipment` → `HUMAN_GATE_REQUIRED`
14. Sonuç: PARTIAL. Kanıt dosyası bu turda yeniden yürütülmedi; çelişen yeni kanıt yoksa eski sınıf korundu.

### MF-MKT-04
1. Numara: MF-MKT-04
2. Ad: Duplicate hub stacks
3. Açıklama: `marketplaceHub.js`, `marketplaceV35.js`, `marketplaceSandboxPlugin`
4. Kaynak: BUZZARD_MISSING_FEATURES_MASTER_LIST.md
5. Modül: MKT
6. Dosyalar: `marketplaceHub.js`, `marketplaceV35.js`, `marketplaceSandboxPlugin`
7. Kod durumu: `marketplaceHub.js`, `marketplaceV35.js`, `marketplaceSandboxPlugin`
8. Test durumu: List is an audit claim. Not re-executed here.
9. Entegrasyon: `marketplaceHub.js`, `marketplaceV35.js`, `marketplaceSandboxPlugin`
10. Son bilinen kayıt: 2026-11-17; bu denetimin HEAD değeri 63e55af5.
11. Önceki durum: PARTIAL
12. Güncel durum: PARTIAL
13. Eksik kanıt: `marketplaceHub.js`, `marketplaceV35.js`, `marketplaceSandboxPlugin`
14. Sonuç: PARTIAL. Kanıt dosyası bu turda yeniden yürütülmedi; çelişen yeni kanıt yoksa eski sınıf korundu.

### MF-CS-02
1. Numara: MF-CS-02
2. Ad: Verified-sender order disclosure policy
3. Açıklama: `verifySender()` exists; full abuse matrix not audited
4. Kaynak: BUZZARD_MISSING_FEATURES_MASTER_LIST.md
5. Modül: CS
6. Dosyalar: `verifySender()` exists; full abuse matrix not audited
7. Kod durumu: `verifySender()` exists; full abuse matrix not audited
8. Test durumu: List is an audit claim. Not re-executed here.
9. Entegrasyon: `verifySender()` exists; full abuse matrix not audited
10. Son bilinen kayıt: 2026-11-17; bu denetimin HEAD değeri 63e55af5.
11. Önceki durum: PARTIAL
12. Güncel durum: PARTIAL
13. Eksik kanıt: `verifySender()` exists; full abuse matrix not audited
14. Sonuç: PARTIAL. Kanıt dosyası bu turda yeniden yürütülmedi; çelişen yeni kanıt yoksa eski sınıf korundu.

### MF-CS-03
1. Numara: MF-CS-03
2. Ad: Auto-send without approval
3. Açıklama: `draftEmail` sets `autoSendAuthorized: false`
4. Kaynak: BUZZARD_MISSING_FEATURES_MASTER_LIST.md
5. Modül: CS
6. Dosyalar: `draftEmail` sets `autoSendAuthorized: false`
7. Kod durumu: `draftEmail` sets `autoSendAuthorized: false`
8. Test durumu: List is an audit claim. Not re-executed here.
9. Entegrasyon: `draftEmail` sets `autoSendAuthorized: false`
10. Son bilinen kayıt: 2026-11-17; bu denetimin HEAD değeri 63e55af5.
11. Önceki durum: PARTIAL
12. Güncel durum: PARTIAL
13. Eksik kanıt: `draftEmail` sets `autoSendAuthorized: false`
14. Sonuç: PARTIAL. Kanıt dosyası bu turda yeniden yürütülmedi; çelişen yeni kanıt yoksa eski sınıf korundu.

### MF-AI-02
1. Numara: MF-AI-02
2. Ad: 17 agents executing delegated tasks on live data
3. Açıklama: Inventory passes; orchestrator execution not E2E HTTP verified
4. Kaynak: BUZZARD_MISSING_FEATURES_MASTER_LIST.md
5. Modül: AI
6. Dosyalar: Inventory passes; orchestrator execution not E2E HTTP verified
7. Kod durumu: Inventory passes; orchestrator execution not E2E HTTP verified
8. Test durumu: List is an audit claim. Not re-executed here.
9. Entegrasyon: Inventory passes; orchestrator execution not E2E HTTP verified
10. Son bilinen kayıt: 2026-11-17; bu denetimin HEAD değeri 63e55af5.
11. Önceki durum: PARTIAL
12. Güncel durum: PARTIAL
13. Eksik kanıt: Inventory passes; orchestrator execution not E2E HTTP verified
14. Sonuç: PARTIAL. Kanıt dosyası bu turda yeniden yürütülmedi; çelişen yeni kanıt yoksa eski sınıf korundu.

### MF-SF-01
1. Numara: MF-SF-01
2. Ad: 30-locale professional translation
3. Açıklama: `productContentI18n` — 29 machine strings per envelope in sample
4. Kaynak: BUZZARD_MISSING_FEATURES_MASTER_LIST.md
5. Modül: SF
6. Dosyalar: `productContentI18n` — 29 machine strings per envelope in sample
7. Kod durumu: `productContentI18n` — 29 machine strings per envelope in sample
8. Test durumu: List is an audit claim. Not re-executed here.
9. Entegrasyon: `productContentI18n` — 29 machine strings per envelope in sample
10. Son bilinen kayıt: 2026-11-17; bu denetimin HEAD değeri 63e55af5.
11. Önceki durum: PARTIAL
12. Güncel durum: PARTIAL
13. Eksik kanıt: `productContentI18n` — 29 machine strings per envelope in sample
14. Sonuç: PARTIAL. Kanıt dosyası bu turda yeniden yürütülmedi; çelişen yeni kanıt yoksa eski sınıf korundu.

### MF-SEC-01
1. Numara: MF-SEC-01
2. Ad: Strong JWT secret enforced at runtime
3. Açıklama: `HEAD:dbAuth.js` fallback `DEV_ONLY_CHANGE_ME`
4. Kaynak: BUZZARD_MISSING_FEATURES_MASTER_LIST.md
5. Modül: SEC
6. Dosyalar: `HEAD:dbAuth.js` fallback `DEV_ONLY_CHANGE_ME`
7. Kod durumu: `HEAD:dbAuth.js` fallback `DEV_ONLY_CHANGE_ME`
8. Test durumu: List is an audit claim. Not re-executed here.
9. Entegrasyon: `HEAD:dbAuth.js` fallback `DEV_ONLY_CHANGE_ME`
10. Son bilinen kayıt: 2026-11-17; bu denetimin HEAD değeri 63e55af5.
11. Önceki durum: PARTIAL
12. Güncel durum: PARTIAL
13. Eksik kanıt: `HEAD:dbAuth.js` fallback `DEV_ONLY_CHANGE_ME`
14. Sonuç: PARTIAL. Kanıt dosyası bu turda yeniden yürütülmedi; çelişen yeni kanıt yoksa eski sınıf korundu.

### MF-SEC-02
1. Numara: MF-SEC-02
2. Ad: Token revocation on password change
3. Açıklama: Implemented in **uncommitted** `dbAuth.js` only
4. Kaynak: BUZZARD_MISSING_FEATURES_MASTER_LIST.md
5. Modül: SEC
6. Dosyalar: Implemented in **uncommitted** `dbAuth.js` only
7. Kod durumu: Implemented in **uncommitted** `dbAuth.js` only
8. Test durumu: List is an audit claim. Not re-executed here.
9. Entegrasyon: Implemented in **uncommitted** `dbAuth.js` only
10. Son bilinen kayıt: 2026-11-17; bu denetimin HEAD değeri 63e55af5.
11. Önceki durum: PARTIAL
12. Güncel durum: PARTIAL
13. Eksik kanıt: Implemented in **uncommitted** `dbAuth.js` only
14. Sonuç: PARTIAL. Kanıt dosyası bu turda yeniden yürütülmedi; çelişen yeni kanıt yoksa eski sınıf korundu.

### MF-SEC-03
1. Numara: MF-SEC-03
2. Ad: Production disk JSON migration applied
3. Açıklama: `jsonStoreIntegrity.test.mjs` — **6 failing** migration tests on worktree
4. Kaynak: BUZZARD_MISSING_FEATURES_MASTER_LIST.md
5. Modül: SEC
6. Dosyalar: `jsonStoreIntegrity.test.mjs` — **6 failing** migration tests on worktree
7. Kod durumu: `jsonStoreIntegrity.test.mjs` — **6 failing** migration tests on worktree
8. Test durumu: List is an audit claim. Not re-executed here.
9. Entegrasyon: `jsonStoreIntegrity.test.mjs` — **6 failing** migration tests on worktree
10. Son bilinen kayıt: 2026-11-17; bu denetimin HEAD değeri 63e55af5.
11. Önceki durum: PARTIAL
12. Güncel durum: PARTIAL
13. Eksik kanıt: `jsonStoreIntegrity.test.mjs` — **6 failing** migration tests on worktree
14. Sonuç: PARTIAL. Kanıt dosyası bu turda yeniden yürütülmedi; çelişen yeni kanıt yoksa eski sınıf korundu.

### MF-SEC-04
1. Numara: MF-SEC-04
2. Ad: Admin route matrix completeness
3. Açıklama: `adminRouteMatrix.test.mjs` failure on worktree
4. Kaynak: BUZZARD_MISSING_FEATURES_MASTER_LIST.md
5. Modül: SEC
6. Dosyalar: `adminRouteMatrix.test.mjs` failure on worktree
7. Kod durumu: `adminRouteMatrix.test.mjs` failure on worktree
8. Test durumu: List is an audit claim. Not re-executed here.
9. Entegrasyon: `adminRouteMatrix.test.mjs` failure on worktree
10. Son bilinen kayıt: 2026-11-17; bu denetimin HEAD değeri 63e55af5.
11. Önceki durum: PARTIAL
12. Güncel durum: PARTIAL
13. Eksik kanıt: `adminRouteMatrix.test.mjs` failure on worktree
14. Sonuç: PARTIAL. Kanıt dosyası bu turda yeniden yürütülmedi; çelişen yeni kanıt yoksa eski sınıf korundu.

### MF-REP-02
1. Numara: MF-REP-02
2. Ad: Dashboards vs backend truth
3. Açıklama: Integration snapshots are dry
4. Kaynak: BUZZARD_MISSING_FEATURES_MASTER_LIST.md
5. Modül: REP
6. Dosyalar: Integration snapshots are dry
7. Kod durumu: Integration snapshots are dry
8. Test durumu: List is an audit claim. Not re-executed here.
9. Entegrasyon: Integration snapshots are dry
10. Son bilinen kayıt: 2026-11-17; bu denetimin HEAD değeri 63e55af5.
11. Önceki durum: PARTIAL
12. Güncel durum: PARTIAL
13. Eksik kanıt: Integration snapshots are dry
14. Sonuç: PARTIAL. Kanıt dosyası bu turda yeniden yürütülmedi; çelişen yeni kanıt yoksa eski sınıf korundu.
