# 8 previously not-started tasks — revalidation

Dört adsız madde uydurulmadı. Sekiz kaydın sekizi de envanterde isimlidir.

### S16-01
1. Numara: 1
2. Ad: Textile AI
3. Açıklama: Textile homepage, slides, video, optional measurements/photo, age/profession outfits, virtual try-on, angles, privacy.
4. Kaynak: docs/MASTER_COMMAND/SPECIAL_16_TASKS.json
5. Modül: Textile AI
6. Dosyalar: ['server/lib/storefront/textileProgram.js']
7. Kod durumu: data/buzzard_categories.json cat-01; server/lib/pusat/council.js textile_ai; lib/navigation/home-config.ts TEXTIL campaign.
8. Test durumu: ['server/__tests__/special16Phase4.test.mjs']
9. Entegrasyon: NOT_STARTED
10. Son bilinen kayıt: 2026-11-01; bu denetimin HEAD değeri 63e55af5.
11. Önceki durum: NOT_STARTED
12. Güncel durum: PARTIAL
13. Eksik kanıt: Local textile scope, text slides, and consent gates exist. Licensed video and a live vision model do not. server/lib/storefront/textileProductScope.js, textileProgram.js. Test: server/__tests__/unstartedLocalSurfaces.test.mjs.
14. Sonuç: PARTIAL. Kanıt dosyası bu turda yeniden yürütülmedi; çelişen yeni kanıt yoksa eski sınıf korundu.

Güncel kanıt: Local textile scope, text slides, and consent gates exist. Licensed video and a live vision model do not. server/lib/storefront/textileProductScope.js, textileProgram.js. Test: server/__tests__/unstartedLocalSurfaces.test.mjs.

### S16-06
1. Numara: 6
2. Ad: AB-27 national and special days
3. Açıklama: Verified calendars; homepage banner/slide/video in local language; schedule, preview, edit, close, copyright.
4. Kaynak: docs/MASTER_COMMAND/SPECIAL_16_TASKS.json
5. Modül: AB-27 national and special days
6. Dosyalar: ['server/lib/storefront/holidayProgram.js', 'data/calendar/ab27_national_days.v1.json']
7. Kod durumu: Comment in ab27Logistics only.
8. Test durumu: ['server/__tests__/special16Phase4.test.mjs']
9. Entegrasyon: NOT_STARTED
10. Son bilinen kayıt: 2026-11-01; bu denetimin HEAD değeri 63e55af5.
11. Önceki durum: NOT_STARTED
12. Güncel durum: PARTIAL
13. Eksik kanıt: 27 sourced national days and a local preview/edit/close draft exist. Homepage publish stays blocked. Not a full legal calendar. server/lib/storefront/holidayProgram.js and data/calendar/ab27_national_days.v1.json.
14. Sonuç: PARTIAL. Kanıt dosyası bu turda yeniden yürütülmedi; çelişen yeni kanıt yoksa eski sınıf korundu.

Güncel kanıt: 27 sourced national days and a local preview/edit/close draft exist. Homepage publish stays blocked. Not a full legal calendar. server/lib/storefront/holidayProgram.js and data/calendar/ab27_national_days.v1.json.

### MF-SUP-02
1. Numara: MF-SUP-02
2. Ad: `supplierOrderOrchestrator` integration
3. Açıklama: **Zero** `require()` references in repo (grep)
4. Kaynak: BUZZARD_MISSING_FEATURES_MASTER_LIST.md
5. Modül: SUP
6. Dosyalar: **Zero** `require()` references in repo (grep)
7. Kod durumu: **Zero** `require()` references in repo (grep)
8. Test durumu: List is an audit claim. Not re-executed here.
9. Entegrasyon: **Zero** `require()` references in repo (grep)
10. Son bilinen kayıt: 2026-11-17; bu denetimin HEAD değeri 63e55af5.
11. Önceki durum: NOT_STARTED
12. Güncel durum: PARTIAL
13. Eksik kanıt: supplierOrderOrchestrator.js is required by orderManagementOrchestrator.js. Dry forward returns live false. No live purchase.
14. Sonuç: PARTIAL. Kanıt dosyası bu turda yeniden yürütülmedi; çelişen yeni kanıt yoksa eski sınıf korundu.

Güncel kanıt: supplierOrderOrchestrator.js is required by orderManagementOrchestrator.js. Dry forward returns live false. No live purchase.

### MF-TEX-01
1. Numara: MF-TEX-01
2. Ad: Real virtual try-on / vision model
3. Açıklama: `textileProgram.js` “skeleton”; `demoTryOn` only
4. Kaynak: BUZZARD_MISSING_FEATURES_MASTER_LIST.md
5. Modül: TEX
6. Dosyalar: `textileProgram.js` “skeleton”; `demoTryOn` only
7. Kod durumu: `textileProgram.js` “skeleton”; `demoTryOn` only
8. Test durumu: List is an audit claim. Not re-executed here.
9. Entegrasyon: `textileProgram.js` “skeleton”; `demoTryOn` only
10. Son bilinen kayıt: 2026-11-17; bu denetimin HEAD değeri 63e55af5.
11. Önceki durum: NOT_STARTED
12. Güncel durum: PARTIAL
13. Eksik kanıt: tryOnPipeline.js checks consent and angles and returns VISION_MODEL_BLOCKED. No vision model runs.
14. Sonuç: PARTIAL. Kanıt dosyası bu turda yeniden yürütülmedi; çelişen yeni kanıt yoksa eski sınıf korundu.

Güncel kanıt: tryOnPipeline.js checks consent and angles and returns VISION_MODEL_BLOCKED. No vision model runs.

### MF-TEX-02
1. Numara: MF-TEX-02
2. Ad: Mobile camera pipeline
3. Açıklama: Not found as production path
4. Kaynak: BUZZARD_MISSING_FEATURES_MASTER_LIST.md
5. Modül: TEX
6. Dosyalar: Not found as production path
7. Kod durumu: Not found as production path
8. Test durumu: List is an audit claim. Not re-executed here.
9. Entegrasyon: Not found as production path
10. Son bilinen kayıt: 2026-11-17; bu denetimin HEAD değeri 63e55af5.
11. Önceki durum: NOT_STARTED
12. Güncel durum: PARTIAL
13. Eksik kanıt: cameraIntake.js accepts a jpeg/png size claim and stores nothing. No production camera route.
14. Sonuç: PARTIAL. Kanıt dosyası bu turda yeniden yürütülmedi; çelişen yeni kanıt yoksa eski sınıf korundu.

Güncel kanıt: cameraIntake.js accepts a jpeg/png size claim and stores nothing. No production camera route.

### MF-SF-02
1. Numara: MF-SF-02
2. Ad: Device attestation (BitLocker/MFA)
3. Açıklama: `deviceStandard.js` — `completeClaim: false`
4. Kaynak: BUZZARD_MISSING_FEATURES_MASTER_LIST.md
5. Modül: SF
6. Dosyalar: `deviceStandard.js` — `completeClaim: false`
7. Kod durumu: `deviceStandard.js` — `completeClaim: false`
8. Test durumu: List is an audit claim. Not re-executed here.
9. Entegrasyon: `deviceStandard.js` — `completeClaim: false`
10. Son bilinen kayıt: 2026-11-17; bu denetimin HEAD değeri 63e55af5.
11. Önceki durum: NOT_STARTED
12. Güncel durum: PARTIAL
13. Eksik kanıt: deviceStandard.js keeps a checkbox from counting as attestation. A desk review is capped at 64 and is not a live device.
14. Sonuç: PARTIAL. Kanıt dosyası bu turda yeniden yürütülmedi; çelişen yeni kanıt yoksa eski sınıf korundu.

Güncel kanıt: deviceStandard.js keeps a checkbox from counting as attestation. A desk review is capped at 64 and is not a live device.

### MF-MKTG-01
1. Numara: MF-MKTG-01
2. Ad: Google/Facebook/TikTok/YouTube adapters
3. Açıklama: No matches in `server/lib/marketing`
4. Kaynak: BUZZARD_MISSING_FEATURES_MASTER_LIST.md
5. Modül: MKTG
6. Dosyalar: No matches in `server/lib/marketing`
7. Kod durumu: No matches in `server/lib/marketing`
8. Test durumu: List is an audit claim. Not re-executed here.
9. Entegrasyon: No matches in `server/lib/marketing`
10. Son bilinen kayıt: 2026-11-17; bu denetimin HEAD değeri 63e55af5.
11. Önceki durum: NOT_STARTED
12. Güncel durum: PARTIAL
13. Eksik kanıt: adChannelAdapters.js names Google, Facebook, TikTok, and YouTube and makes no network call.
14. Sonuç: PARTIAL. Kanıt dosyası bu turda yeniden yürütülmedi; çelişen yeni kanıt yoksa eski sınıf korundu.

Güncel kanıt: adChannelAdapters.js names Google, Facebook, TikTok, and YouTube and makes no network call.

### MF-MKTG-02
1. Numara: MF-MKTG-02
2. Ad: Campaign spend / budgets
3. Açıklama: `campaignDraft` only
4. Kaynak: BUZZARD_MISSING_FEATURES_MASTER_LIST.md
5. Modül: MKTG
6. Dosyalar: `campaignDraft` only
7. Kod durumu: `campaignDraft` only
8. Test durumu: List is an audit claim. Not re-executed here.
9. Entegrasyon: `campaignDraft` only
10. Son bilinen kayıt: 2026-11-17; bu denetimin HEAD değeri 63e55af5.
11. Önceki durum: NOT_STARTED
12. Güncel durum: PARTIAL
13. Eksik kanıt: campaignBudget.js can plan a limit and captureSpend returns ADS_SPEND_LOCKED.
14. Sonuç: PARTIAL. Kanıt dosyası bu turda yeniden yürütülmedi; çelişen yeni kanıt yoksa eski sınıf korundu.

Güncel kanıt: campaignBudget.js can plan a limit and captureSpend returns ADS_SPEND_LOCKED.
