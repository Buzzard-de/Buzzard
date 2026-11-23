# 07 — Modül ve fonksiyon haritası

Her üretim ve test dosyasının sembolleri `01_COMPLETE_FILE_INVENTORY.csv` içindedir. Burada en uzun üretim dosyaları ve çıkan sembol adları durur.

| Dosya | Kod satırı | Semboller |
| --- | ---: | --- |
| `intelligence/main.py` | 5.882 | load_live_env, main |
| `server/lib/db.js` | 3.914 | fs, path, Database, dataDir, dbPath, db, slugify, ensureColumn, columns, migrateCatalogSeo, categories, updateCategorySlug, products, updateProductMeta, slug, seoTitle, seoDescript |
| `lib/i18n/locales/machineFill.ts` | 1.984 | machineFlat, nest, root, parts, part, machineCatalogs |
| `styles/pusart.css` | 1.835 |  |
| `intelligence/buzzard_ai_guardian_max.py` | 1.402 | _env_bool, utc_now, new_id, json_dumps, AgentPolicy, CostEvent, total_cost_eur, MemoryRecord, ApprovalRequest, Incident, SQLiteStore, __init__, close, execute, executemany, query,  |
| `styles/globals.css` | 1.392 |  |
| `intelligence/buzzard_ai_complete/commands.py` | 1.317 | bootstrap, complete_init, complete_agents, complete_task, complete_dispatch, complete_tasks, complete_dashboard, complete_report, complete_health, complete_ai_status, complete_scan |
| `styles/shop.css` | 1.250 |  |
| `server/lib/pusat/runtime.js` | 1.008 | crypto, productService, inventory, pricing, getIdempotencyService, ACTIONS, CONTROL_ACTIONS, getDurable, getSinanAgent, WRITE_ACTIONS, SPECIALISTS, isEnabled, isHealthy, health, ex |
| `intelligence/buzzard_orchestrator.py` | 980 | now_iso, new_id, Priority, TaskStatus, RiskLevel, ApprovalDecision, Agent, AgentResult, Database, __init__, connect, _init, execute, one, audit, AgentRegistry, __init__, register,  |
| `components/CheckoutForm.tsx` | 789 | STEPS, stepIndex, router, idempotencyRef, submittingRef, useCustomerCheckoutApi, loadCommerceQuote, cartId, totals, loadQuote, cartSubtotal, quote, response, country, preferred, ad |
| `components/admin/AdminControlCenter.tsx` | 756 | STATUS_CLASS, NoAccess, can, reload, commerce, events, runAction, handleCreateTask, handleSearch, results, handleCategoryStatus, mainCategories, entry, st, overall, blockers |
| `server/lib/auth.js` | 750 | fs, path, crypto, adminTwoFactor, dataDir, usersFile, sessionsFile, seedFile, SESSION_TTL_MS, MAX_SESSIONS_PER_USER, MAX_EMAIL_LENGTH, MAX_PASSWORD_LENGTH, TOKEN_PATTERN, loginRate |
| `intelligence/buzzard_ai_complete/operations/de_ecom_intel_scan.py` | 712 | _now, _fetch_public_sources, _static_offers_for_benchmark, _live_health, _fetch_marketplace_offers, _fetch_ebay_live_offers, _fetch_amazon_live_offers, _collect_all_offers, _offers |
| `scripts/generate-category-translations.mjs` | 707 | __dirname, root, catalogPath, source, mainDe, mainEn, mainAr, mainTr, trDe, trWordDe, trPhraseDe, translateTurkishName, slugToGermanLabel, parts, toGermanLabel, sourceName, de, en, |
| `server/plugins/aiAutomationPlugin.js` | 650 | fs, path, crypto, automationEngine, notificationEngine, aiChatService, phoneAssistantService, recommendationService, productStore, supplierStore, fulfillmentStore, dataDir, cartsFi |
| `server/lib/controlCenter.js` | 634 | crypto, categoryVisibility, newId, parseJson, recordSystemEvent, id, seedDefaults, count, insert, sinan, intCount, integrations, ins, getSystemStatus, dbHealth, orchestrator, guard |
| `lib/i18n/locales/en.ts` | 608 | catalog |
| `intelligence/buzzard_ki_gesamt/server/plugins/aiAutomationPlugin.js` | 604 | fs, path, crypto, automationEngine, notificationEngine, aiChatService, phoneAssistantService, recommendationService, productStore, supplierStore, fulfillmentStore, dataDir, cartsFi |
| `server/lib/logistics/eu27SeedV2.js` | 601 | v1, RETRIEVED, src, SOURCES_V2, FI_LETTER, FR_ARCEP, BE_LICENCES, IE_COMREG, AT_PEV, RO_ANCOM_PAGE1, PRIVATE_CANDIDATES, SE_PTS_PAGE, slug, extraEntities, fi, fr, be, ie, se, at, r |
| `lib/i18n/locales/de.ts` | 599 | catalog |
| `lib/i18n/locales/ar.ts` | 589 | catalog |
| `lib/i18n/locales/tr.ts` | 589 | catalog |
| `server/lib/logistics/eu27SeedV3.js` | 581 | v2mod, RETRIEVED, src, SOURCES_V3, slug, CZ_CTU, BG_UPS, SK_NAMED, SI_AKOS, LU_ILR, MT_MCA, CY_OCECPR, LOCAL_CANDIDATES, row, extras, out, overlayRegister, buildMasterV3, base, add |
| `server/lib/logistics/eu27SeedV4.js` | 575 | fs, path, v3mod, RETRIEVED, src, SOURCES_V4, loadRegister, slug, row, EE_COURIER_ACTIVE_2025, LV_NAMED, PT_NAMED, LT_NAMED, HU_LOCKERS, overlayRegister, extrasFromRegisters, out, a |
| `styles/admin.css` | 558 |  |
| `server/lib/controlCenterJobAdmission.js` | 557 | CONTROL_CENTER_JOB_RESOURCE, CONTROL_CENTER_JOB_ORIGIN, CONTROL_CENTER_JOB_PERMISSION, JOB_SOURCES, ADMITTED_SOURCES, NON_RETRYABLE_JOB_CODES, ALLOWED_JOB_TYPES, ALLOWED_PRIORITIES |
| `scripts/generate-v32-v40-modules.mjs` | 552 | ROOT, MODULES, write, full, libJs, statusFn, overviewFn, isEnabled, createRecord, result, listRecords, getRecordByCode, updateRecord, existing, createJob, result, listJobs, overvie |
| `server/lib/analyticsEngine.js` | 551 | fs, path, rootDir, dataDir, ordersFile, customersFile, productsFile, categoriesFile, returnsFile, fulfillmentsFile, supplierOrdersFile, TZ, LOW_STOCK_THRESHOLD, readJson, berlinDat |
| `server/lib/pusat/sinanBeyAgent.js` | 539 | fs, path, REPLIES, ID, HUMAN_GATES, DOMAIN_PATHS, createSinanBeyAgent, durable, attendance, lab, xfLab, esatWatch, esat, profile, requestHumanGate, assignFromPusat, acceptTask, upd |
| `server/lib/buzzardNative/thinking/transformer.js` | 528 | crypto, RSS_LIMIT, TIME_LIMIT_MS, rng, zeros, fillRand, softmax, e, s, createTransformer, rnd, D, H, Dh, P, F, V, scale, m, paramCount, layerNorm, D, inv, y, hat |
| `lib/i18n/locales/bg.ts` | 519 | catalog |
| `lib/i18n/locales/ca.ts` | 519 | catalog |
| `lib/i18n/locales/cs.ts` | 519 | catalog |
| `lib/i18n/locales/da.ts` | 519 | catalog |
| `lib/i18n/locales/el.ts` | 519 | catalog |
| `lib/i18n/locales/es.ts` | 519 | catalog |
| `lib/i18n/locales/et.ts` | 519 | catalog |
| `lib/i18n/locales/eu.ts` | 519 | catalog |
| `lib/i18n/locales/fi.ts` | 519 | catalog |
