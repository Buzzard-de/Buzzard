# 55 blocked tasks — revalidation

HEAD `63e55af5`. Satış kapalı. Canlı hesap bağlanmadı.

## Focus ids

### P21-T-1.2 — Confirm the running API, if any, loaded `jwtSecret.js` from `9b86c1b7`
- Eski durum: BLOCKED_EXTERNAL. Yeni durum: BLOCKED_EXTERNAL.
- Engel duruyor. API anahtarı, harici hesap veya lisans, insan onayı ve gerçek entegrasyon gerekiyor.
- Yalnızca yapılandırma eksiği değil. Kuru kod veya kilit var. Canlı çalışma yok.
- Kanıt: BLOCKED_EXTERNAL. Ports 3000 and 3001 must stay up. The running process was not restarted, so this worktree cannot prove which commit it loaded

### P21-T-17.3 — Live API reload
- Eski durum: BLOCKED_EXTERNAL. Yeni durum: BLOCKED_EXTERNAL.
- Engel duruyor. API anahtarı, harici hesap veya lisans, insan onayı ve gerçek entegrasyon gerekiyor.
- Yalnızca yapılandırma eksiği değil. Kuru kod veya kilit var. Canlı çalışma yok.
- Kanıt: Not done; do not restart 3000/3001 from an audit

### P21-T-4.2 — Live supplier HTTP
- Eski durum: BLOCKED_EXTERNAL. Yeni durum: BLOCKED_EXTERNAL.
- Engel duruyor. API anahtarı, harici hesap veya lisans, insan onayı ve gerçek entegrasyon gerekiyor.
- Yalnızca yapılandırma eksiği değil. Kuru kod veya kilit var. Canlı çalışma yok.
- Kanıt: A named test double is replaced by a credentialed call only after an explicit flag; default stays `networkBlocked`

### P21-T-5.2 — Live price write
- Eski durum: BLOCKED_EXTERNAL. Yeni durum: BLOCKED_EXTERNAL.
- Engel duruyor. API anahtarı, harici hesap veya lisans, insan onayı ve gerçek entegrasyon gerekiyor.
- Yalnızca yapılandırma eksiği değil. Kuru kod veya kilit var. Canlı çalışma yok.
- Kanıt: No write path succeeds while `BUZZARD_SALES_ENABLED` is not fully armed

### P21-T-6.4 — Live supplier submit
- Eski durum: BLOCKED_EXTERNAL. Yeni durum: BLOCKED_EXTERNAL.
- Engel duruyor. API anahtarı, harici hesap veya lisans, insan onayı ve gerçek entegrasyon gerekiyor.
- Yalnızca yapılandırma eksiği değil. Kuru kod veya kilit var. Canlı çalışma yok.
- Kanıt: Submit returns disabled unless a human flag is on

### P21-T-7.2 — PSP capture and money refund
- Eski durum: BLOCKED_EXTERNAL. Yeni durum: BLOCKED_EXTERNAL.
- Engel duruyor. API anahtarı, harici hesap veya lisans, insan onayı ve gerçek entegrasyon gerekiyor.
- Yalnızca yapılandırma eksiği değil. Kuru kod veya kilit var. Canlı çalışma yok.
- Kanıt: Still impossible while sales flags are off; no task closes this by a mock

### P21-T-8.2 — Live carrier rates
- Eski durum: BLOCKED_EXTERNAL. Yeni durum: BLOCKED_EXTERNAL.
- Engel duruyor. API anahtarı, harici hesap veya lisans, insan onayı ve gerçek entegrasyon gerekiyor.
- Yalnızca yapılandırma eksiği değil. Kuru kod veya kilit var. Canlı çalışma yok.
- Kanıt: `LOG_LIVE_RATES` stays false until credentials exist

### P21-T-9.2 — Live try-on model
- Eski durum: BLOCKED_EXTERNAL. Yeni durum: BLOCKED_EXTERNAL.
- Engel duruyor. API anahtarı, harici hesap veya lisans, insan onayı ve gerçek entegrasyon gerekiyor.
- Yalnızca yapılandırma eksiği değil. Kuru kod veya kilit var. Canlı çalışma yok.
- Kanıt: Not started

### P21-T-10.3 — Live marketplace publish
- Eski durum: BLOCKED_EXTERNAL. Yeni durum: BLOCKED_EXTERNAL.
- Engel duruyor. API anahtarı, harici hesap veya lisans, insan onayı ve gerçek entegrasyon gerekiyor.
- Yalnızca yapılandırma eksiği değil. Kuru kod veya kilit var. Canlı çalışma yok.
- Kanıt: Open. `MKT_LIVE_PUBLISH` stays false

### P21-T-12.2 — Live mailbox
- Eski durum: BLOCKED_EXTERNAL. Yeni durum: BLOCKED_EXTERNAL.
- Engel duruyor. API anahtarı, harici hesap veya lisans, insan onayı ve gerçek entegrasyon gerekiyor.
- Yalnızca yapılandırma eksiği değil. Kuru kod veya kilit var. Canlı çalışma yok.
- Kanıt: Queue stays local

### P21-T-13.2 — Live voice
- Eski durum: BLOCKED_EXTERNAL. Yeni durum: BLOCKED_EXTERNAL.
- Engel duruyor. API anahtarı, harici hesap veya lisans, insan onayı ve gerçek entegrasyon gerekiyor.
- Yalnızca yapılandırma eksiği değil. Kuru kod veya kilit var. Canlı çalışma yok.
- Kanıt: Stays blocked

### P21-T-14.2 — Live LLM council
- Eski durum: BLOCKED_EXTERNAL. Yeni durum: BLOCKED_EXTERNAL.
- Engel duruyor. API anahtarı, harici hesap veya lisans, insan onayı ve gerçek entegrasyon gerekiyor.
- Yalnızca yapılandırma eksiği değil. Kuru kod veya kilit var. Canlı çalışma yok.
- Kanıt: No outbound call in the default test

### P21-T-15.3 — CDN warm
- Eski durum: BLOCKED_EXTERNAL. Yeni durum: BLOCKED_EXTERNAL.
- Engel duruyor. API anahtarı, harici hesap veya lisans, insan onayı ve gerçek entegrasyon gerekiyor.
- Yalnızca yapılandırma eksiği değil. Kuru kod veya kilit var. Canlı çalışma yok.
- Kanıt: Not a software pass

### P21-T-16.3 — Tax Connect filing
- Eski durum: BLOCKED_EXTERNAL. Yeni durum: BLOCKED_EXTERNAL.
- Engel duruyor. API anahtarı, harici hesap veya lisans, insan onayı ve gerçek entegrasyon gerekiyor.
- Yalnızca yapılandırma eksiği değil. Kuru kod veya kilit var. Canlı çalışma yok.
- Kanıt: Stays disconnected

### P21-T-18.2 — Paid ads
- Eski durum: BLOCKED_EXTERNAL. Yeni durum: BLOCKED_EXTERNAL.
- Engel duruyor. API anahtarı, harici hesap veya lisans, insan onayı ve gerçek entegrasyon gerekiyor.
- Yalnızca yapılandırma eksiği değil. Kuru kod veya kilit var. Canlı çalışma yok.
- Kanıt: Stays blocked

### P21-T-19.2 — Production BI
- Eski durum: BLOCKED_EXTERNAL. Yeni durum: BLOCKED_EXTERNAL.
- Engel duruyor. API anahtarı, harici hesap veya lisans, insan onayı ve gerçek entegrasyon gerekiyor.
- Yalnızca yapılandırma eksiği değil. Kuru kod veya kilit var. Canlı çalışma yok.
- Kanıt: Not a local JSON pass

### P21-T-20.2 — External load harness
- Eski durum: BLOCKED_EXTERNAL. Yeni durum: BLOCKED_EXTERNAL.
- Engel duruyor. API anahtarı, harici hesap veya lisans, insan onayı ve gerçek entegrasyon gerekiyor.
- Yalnızca yapılandırma eksiği değil. Kuru kod veya kilit var. Canlı çalışma yok.
- Kanıt: Stays blocked until a harness exists

### P21-T-21.3 — Production rehearsal
- Eski durum: BLOCKED_EXTERNAL. Yeni durum: BLOCKED_EXTERNAL.
- Engel duruyor. API anahtarı, harici hesap veya lisans, insan onayı ve gerçek entegrasyon gerekiyor.
- Yalnızca yapılandırma eksiği değil. Kuru kod veya kilit var. Canlı çalışma yok.
- Kanıt: Open. `E2E_PRODUCTION_RUN` stays false


## P21-T-16.1

Eski durum BLOCKED_EXTERNAL. Yeni durum COMPLETE_WITH_LIMITATIONS. phase16TaxCompliance.js requires LISTED_PARTY for a prohibited party and HUMAN_REVIEW when the list is missing. The old ok-or-status pass is gone. Live ELSTER and Tax Connect stay blocked under other ids.


## All 55 previous blocked rows

- DL51-19 | Canlı TecDoc bağlantısı | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | Live provider
- DL51-20 | Canlı tedarikçi bağlantısı | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | Live provider
- DL51-28 | Ödeme alma sistemi | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | Live provider
- DL51-30 | Gerçek para iade sistemi | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | Live provider
- DL51-37 | Resmî Tax Connect | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | Live provider
- DL51-41 | Canlı kargo fiyatı | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | Live provider
- P21-T-1.2 | Confirm the running API, if any, loaded `jwtSecret.js` from `9b86c1b7` | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | BLOCKED_EXTERNAL. Ports 3000 and 3001 must stay up. The running process was not restarted, so this worktree cannot prove which commit it loaded
- P21-T-4.2 | Live supplier HTTP | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | A named test double is replaced by a credentialed call only after an explicit flag; default stays `networkBlocked`
- P21-T-5.2 | Live price write | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | No write path succeeds while `BUZZARD_SALES_ENABLED` is not fully armed
- P21-T-6.4 | Live supplier submit | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | Submit returns disabled unless a human flag is on
- P21-T-7.2 | PSP capture and money refund | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | Still impossible while sales flags are off; no task closes this by a mock
- P21-T-8.2 | Live carrier rates | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | `LOG_LIVE_RATES` stays false until credentials exist
- P21-T-9.2 | Live try-on model | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | Not started
- P21-T-10.3 | Live marketplace publish | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | Open. `MKT_LIVE_PUBLISH` stays false
- P21-T-12.2 | Live mailbox | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | Queue stays local
- P21-T-13.2 | Live voice | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | Stays blocked
- P21-T-14.2 | Live LLM council | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | No outbound call in the default test
- P21-T-15.3 | CDN warm | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | Not a software pass
- P21-T-16.1 | Sanctions predicate `ok \ | old BLOCKED_EXTERNAL | new COMPLETE_WITH_LIMITATIONS | blocked === false \
- P21-T-16.3 | Tax Connect filing | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | Stays disconnected
- P21-T-17.3 | Live API reload | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | Not done; do not restart 3000/3001 from an audit
- P21-T-18.2 | Paid ads | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | Stays blocked
- P21-T-19.2 | Production BI | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | Not a local JSON pass
- P21-T-20.2 | External load harness | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | Stays blocked until a harness exists
- P21-T-21.3 | Production rehearsal | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | Open. `E2E_PRODUCTION_RUN` stays false
- S16-07 | AB-27 Tax Connect | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | ['Operator mandate']
- S16-09 | 24/7 phone AI and voice council | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | ['Operator SIP']
- INC-live_api_3001_security | live_api_3001_security | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | No :3001 restart authorized
- INC-prod_session_verify | prod_session_verify | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | BLOCKED_EXTERNAL
- INC-prod_db_persistent_disk | prod_db_persistent_disk | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | BLOCKED_EXTERNAL
- INC-live_stock_price_feed | live_stock_price_feed | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | BLOCKED_EXTERNAL
- MF-ORD-04 | Supplier order forward (live) | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | `forwardDrySupplierOrder`; dev-list #20 LIVE_BLOCKED
- MF-PAY-01 | Payment capture | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | `paymentSandbox.capture()` always refuses; dev-list #28
- MF-PAY-02 | Money refund | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | `refundMoney()` sandbox; dev-list #30
- MF-PAY-03 | Banking reconciliation (live) | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | `financeOpsSnapshot` reports `filingLive: false`
- MF-SUP-01 | Live supplier API / TecDoc | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | dev-list #19, #20
- MF-LOG-01 | Live carrier rates | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | dev-list #41
- MF-MKT-01 | OAuth token refresh (live) | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | Connectors `configured: false, live: false` in `shippingConnectorRegistry` pattern
- MF-MKT-02 | Stock/price sync (live) | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | Dry `publishListing` in `preflightListing`
- MF-CS-01 | Production inbound email (IMAP) | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | `incomingEmailProcessor` — unit-level only
- MF-AI-01 | Live voice / telephony | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | `automationHealth`: `liveCallsBlocked`
- MF-AI-03 | Central memory live write | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | User rule: no Pusat memory modification
- MF-SF-03 | CDN / cache warm | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | Phase 15 `SF_LIVE_CDN` blocked
- MF-TAX-01 | Tax Connect filing | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | `assessTaxConnect().missing` env keys; dev-list #37
- MF-TAX-02 | Live ELSTER | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | `submitElster` dry
- MF-PERF-01 | Load / concurrency certification | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | Phase 20 excludes `PERF_LOAD_TEST`
- MF-REP-01 | Live BI warehouse | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | Phase 19 `ADM_LIVE_BI`
- CHK-FINAL-006 | eBay credentials + production test | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | eBay credentials + production test
- CHK-FINAL-007 | Amazon Creators credentials + production test | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | Amazon Creators credentials + production test
- CHK-FINAL-008 | Google Ads credentials + production test | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | Google Ads credentials + production test
- CHK-FINAL-011 | TecDoc licensed access where required | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | TecDoc licensed access where required
- CHK-P4-009 | SQLite file on persistent disk (Render) | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | SQLite file on persistent disk (Render)
- CHK-P4-013 | Render env vars set (not in repo) | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | Render env vars set (not in repo)
- CHK-P4-014 | Stripe/PayPal keys **not** set (sales disabled) | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | Stripe/PayPal keys **not** set (sales disabled)
- CHK-P4-025 | Previous Render deploy ID noted | old BLOCKED_EXTERNAL | new BLOCKED_EXTERNAL | Previous Render deploy ID noted
