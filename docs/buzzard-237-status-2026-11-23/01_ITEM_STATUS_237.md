# 237 madde durum turu — 23 Kasım 2026

## Oturum kapanışı — 24 Kasım 2026, 12:33 Europe/Berlin

Dal `cursor/237-morning-status-c293`. Son iş kaydı `a43df8b5`. Satış kilitli. Üretim veritabanı `server/data/buzzard.db` değişmedi: SHA-256 `27d460eca7461f5093406296256be9c9d98b45eaf5493ab91192483902fc0a0f`, boyut 1744896.

Kayıt: 42 madde ✅, 190 madde 🟡, 1 madde ⛔, 4 madde ⚪. Yeşil ışık açılmadı. Canlı ödeme, taşıyıcı, TecDoc, pazar yeri, DNS, Render diski ve ilk gerçek sipariş dışarıda kaldı. Yarın yerel açık maddelerden devam. Madde 23 ve 24 gerekçesiz açılmayacak.

Saat: 23 Kasım 2026, sabah, Europe/Berlin.
Ağaç: `cursor/save-three-day-records-c293`, HEAD `6b0e3ccd`.
Satış kilitli. productionReady false. egress deny.

## Yöntem

Her maddenin görevi, 17 Ekim 2026 kaydındaki Established scope cümlesidir. Orijinal başlık hâlâ UNKNOWN.
Ekim test kemeri `server/lib/software` ve `*IntegritySoftware.test.mjs` bu dalın atası değil. `414ef29a` yalnızca `origin/cursor/software-completion-local-c293` üzerinde.
Bu tur o kemeri tamamlanmış saymadı.

Bu sabah koşulan test: 11 dosya, 249 test, 247 geçti, 2 kaldı. Kalan ikisi `phase1CoreIntegrity.test.mjs`: yüzde 91.7, `CORE_PROTECTED_DATA` ok false, korunan JSON dosyaları `UNEXPECTEDLY_MISSING`.
Geçen dosyalar: csrf, jwtSecretHardening, idorGuard, rateLimitStore, phase7CaptureRoute, webhookSecurity, marketplaceConnectorRegistry, pusatOrchestrator, adminSessionSecurity, phaseSoftwareSide.

Durum kuralı: komşu test geçti diye madde ✅ olmadı. ✅ bu turda 0. Kod veya adı geçen test bu ağaçta görüldüyse 🟡. Aranan sınıf yoksa 🔴. Canlı dış hesap yoksa ve yerel kod bunu reddediyorsa ⛔. Dosya açılmadıysa ⚪.

## Sayılar

İlk tur:

- ✅ 0
- 🟡 92
- 🔴 1
- ⛔ 1
- ⚪ 143

İkinci tur, 23 Kasım 2026 06:19 Europe/Berlin. Yalnızca madde 7 ve madde 15 yeniden açıldı. İkisi ⚪ iken 🟡 oldu. Diğer 235 madde o turda değişmedi.

- ✅ 0
- 🟡 94
- 🔴 1
- ⛔ 1
- ⚪ 141

Madde 16, 23 Kasım 2026 06:50 Europe/Berlin. Yalnızca bu madde yeniden açıldı. ⚪ iken 🟡 oldu.

- ✅ 0
- 🟡 95
- 🔴 1
- ⛔ 1
- ⚪ 140

Madde 17, 23 Kasım 2026 07:28 Europe/Berlin. Yeniden açıldı. Durum 🟡 kaldı. Sayılar değişmedi.

- ✅ 0
- 🟡 95
- 🔴 1
- ⛔ 1
- ⚪ 140

Madde 16 düzeltme, 23 Kasım 2026 07:37 Europe/Berlin. Commerce çekirdeği ve eski sepet yolu tokensuz istekte kapandı. İki vitrin sözleşmesi durduğu için durum 🟡. Sayılar değişmedi.

Madde 17 düzeltme, 23 Kasım 2026 07:39 Europe/Berlin. Guardian, Orchestrator ve DB status tokensuz istekte 401. `/api/health` açık kaldığı için durum 🟡. Sayılar değişmedi.

Madde 18–34, 23 Kasım 2026 07:52 Europe/Berlin. `items18to33Foundation.test.mjs` 6/6. On madde ⚪ iken 🟡 oldu. Madde 30, yazılım cephesi bu dalda olmadığı için 🟡 iken 🔴 oldu.

- ✅ 0
- 🟡 104
- 🔴 2
- ⛔ 1
- ⚪ 130

Madde 35, 23 Kasım 2026 07:53 Europe/Berlin. `pusatOrchestrator.test.mjs` 11/11. Durum 🟡. Sayılar değişmedi.

Madde 36–55, 23 Kasım 2026 08:15 Europe/Berlin. `items36to55Pusat.test.mjs` 5/5. Aynı komutta `diagnosticGetAuth.test.mjs` 3/3. Önceki komutta `pusatCouncil.test.mjs` 6/6, `pusatIdempotency.test.mjs` 6/6, `rbac.test.mjs` 6/6. Sekiz madde ⚪ iken 🟡 oldu. Madde 48, ajan başına Guardian penceresi bulunmadığı için ⚪ iken 🔴 oldu. Madde 51, üç orchestrator GET ucu kimlik istiyor ve test geçtiği için 🟡 iken ✅ oldu.

- ✅ 1
- 🟡 111
- 🔴 3
- ⛔ 1
- ⚪ 121

Madde 56–84, 23 Kasım 2026 08:18 Europe/Berlin. `items56to84Catalog.test.mjs` 5/5. `phase2CategoryInfrastructure.test.mjs` 1/1, `phase3ProductPim.test.mjs` 1/1, `phase5PricingProfit.test.mjs` 3/3. Madde 56 ve 76 ✅. Madde 57, 62 ve 65 🔴. On madde ⚪ iken 🟡 oldu.

- ✅ 3
- 🟡 119
- 🔴 6
- ⛔ 1
- ⚪ 108

Madde 69–74 ve 85–86, 23 Kasım 2026 08:20 Europe/Berlin. `items69to86LocalCatalog.test.mjs` 3/3. Altı madde ⚪ iken 🟡 oldu. Madde 87 🔴 ve madde 88 ⛔ duruyor.

- ✅ 3
- 🟡 125
- 🔴 6
- ⛔ 1
- ⚪ 102

Madde 89–115, 23 Kasım 2026 10:51 Europe/Berlin. `items89to115Commerce.test.mjs` 3/3. On dört madde ⚪ iken 🟡 oldu. Madde 97 ve 111 🔴. Satış ve canlı para kapalı.

- ✅ 3
- 🟡 139
- 🔴 8
- ⛔ 1
- ⚪ 86

Madde 116–130, 23 Kasım 2026 10:53 Europe/Berlin. `items116to130Markets.test.mjs` 2/2. Yedi madde ⚪ iken 🟡 oldu. 35 pazar kaydı yok. Canlı yayın ve canlı gönderi kapalı.

- ✅ 3
- 🟡 146
- 🔴 8
- ⛔ 1
- ⚪ 79

Madde 131–167, 23 Kasım 2026 10:58 Europe/Berlin. `items131to167Storefront.test.mjs` 3/3. Otuz madde ⚪ iken 🟡 oldu. Dil ve ülke ayrı. Canlı ilan, etiket ve gönderim kapalı. `communications.js` ve `shipmentGate` yok.

- ✅ 3
- 🟡 176
- 🔴 8
- ⛔ 1
- ⚪ 49

Madde 168–182, 23 Kasım 2026 10:59 Europe/Berlin. `items168to182Approvals.test.mjs` 1/1. Boş onaycı ve ikinci karar yazılmıyor. Madde 171 ✅. Madde 172, 173 ve 180 🔴. Satış kapalı.

- ✅ 4
- 🟡 178
- 🔴 11
- ⛔ 1
- ⚪ 43

Madde 183–237, 23 Kasım 2026 11:01 Europe/Berlin. `items183to237Ops.test.mjs` 2/2. CSRF 4/4, hız sınırı 2/2, Esat 5/5, misafir ticaret 4/4, yakalama 1/1. Kuru geri yükleme hedef yazmadı. npm audit yüksek eşikte çıkış 0, orta 8. Madde 187 ve 201 ✅. Madde 194, 215 ve 223 🔴.

- ✅ 6
- 🟡 211
- 🔴 14
- ⛔ 1
- ⚪ 5

İkinci tur başlangıcı, madde 2. İki onay kaydı görüldü. ⚪ iken 🟡 oldu. Korumalı 16, 17, 30, 48, 57, 62, 65, 87, 88, 97 ve 111 duruyor. Satış kapalı.

- ✅ 6
- 🟡 212
- 🔴 14
- ⛔ 1
- ⚪ 4

İkinci tur kapanışı, 23 Kasım 2026 11:02 Europe/Berlin. 🟡 maddeler yükseltilmedi. Tarayıcı geçişi, canlı taşıyıcı, canlı pazaryeri, canlı ödeme ve eksik semboller yerinde duruyor. 🔴 maddelere yer tutucu kod yazılmadı. Kalan ⚪ maddeler 200, 205, 220 ve 221. Dış bağımlılık: TecDoc hesabı, taşıyıcı hesapları, pazaryeri hesapları, bu dalın CI kaydı, Render diski ve DNS kontrolü. Güvenli düzeltme boş onaycıyı ve ikinci kararı yazmıyor. Satış hazır değil.

Üçüncü tur, 23 Kasım 2026 11:21 Europe/Berlin. `itemsPhase3Gaps.test.mjs` 6/6. Regresyon 40/40. Madde 48, 57, 62, 65, 87, 97, 172, 173, 180, 194, 215 ve 223 ✅. Madde 30 ve 111 🟡. Madde 16 ve 17 yeniden geçti, durumları duruyor. Madde 88 ⛔. Satış kapalı.

- ✅ 18
- 🟡 214
- 🔴 0
- ⛔ 1
- ⚪ 4

Dördüncü tur, 23 Kasım 2026 11:25 Europe/Berlin. `itemsFourthPassChain.test.mjs` 2/2. Ticari zincir parasız yürüdü. Madde 136 ✅. Madde 30 ve 111 kısmi kaldı. Madde 16 ve 17 sözleşmeleri duruyor. Madde 88 ⛔. 200, 205, 220 ve 221 doğrulanamadı. Satış kapalı.

- ✅ 19
- 🟡 213
- 🔴 0
- ⛔ 1
- ⚪ 4


Beşinci tur, 23 Kasım 2026 11:34 Europe/Berlin. `itemsFifthPass.test.mjs` 3/3. Kimlik testleri ve teşhis testleri geçti. Madde 16, 17, 22 ve 111 ✅. Madde 30 kısmi. Dijital bedende hazır olanlar ifade ve ayrı profil. Konuşma, duyma, ses sentezi, dudak, kol, yürüyüş, oturma, nesne ve kıyafet uygulanmadı. Madde 88 ⛔. 200, 205, 220 ve 221 doğrulanamadı. `/api/health/*` hazırlık uçları eski sözleşme gereği herkese açık kaldı. Satış kapalı.

- ✅ 23
- 🟡 209
- 🔴 0
- ⛔ 1
- ⚪ 4


Altıncı tur, 23 Kasım 2026 11:41 Europe/Berlin. `itemsSixthPass.test.mjs` 3/3. Kanonik yazmalar aktörsüz duruyor. Madde 30 kısmi. Madde 88 ⛔. Dijital beden: ayrı profil var, ifade yalnız etiket ve çizilmiyor. Konuşma, duyma, sentez, dudak, kol, yürüyüş, oturma, nesne ve kıyafet sağlayıcısı yok. Madde 200, 205, 220 ve 221 doğrulanamadı. `gh pr checks 515` bu dalda kontrol döndürmedi. Satış kapalı.

- ✅ 23
- 🟡 209
- 🔴 0
- ⛔ 1
- ⚪ 4

## Maddeler

## Madde 1

- GÖREV: Repository baseline and working-tree integrity
- NE İSTİYOR: Inspect branch, HEAD, dirty files, ancestry; do not destroy work
- KOD: server/lib/platform/phase1CoreIntegrity.js
- TEST: CORE_PROTECTED_DATA bu sabah FAIL. percent 91.7. admin-sessions.json ve diğer korunan dosyalar UNEXPECTEDLY_MISSING.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Korunan JSON tabanı bu çalışma ağacında beklenen durumda değil.

## Madde 2

- GÖREV: Architecture inventory without duplicate systems
- NE İSTİYOR: Single Pusat, single approval center, single product write boundary
- KOD: server/lib/controlCenter.js
- TEST: Kontrol merkezi core_approvals yazıyor. Pusat kuyruğu ayrı orch_approvals yazıyor.
- ENTEGRASYON: Tek onay merkezi ölçütü karşılanmadı.
- DURUM: 🟡
- EKSİK: İki onay kaydı duruyor.

## Madde 3

- GÖREV: Authentication on protected endpoints
- NE İSTİYOR: Unauthenticated callers cannot use protected routes
- KOD: server/__tests__/adminSessionSecurity.test.mjs
- TEST: Bu sabah geçti: tokensuz istek 401.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Bütün korumalı yollar tek tek sayılmadı.

## Madde 4

- GÖREV: Authorization / RBAC on protected operations
- NE İSTİYOR: Permission checks on admin and AI tool paths
- KOD: server/lib/globalAuthMiddleware.js
- TEST: requireAnyAdmin kodda var. Bu sabahki dosyada ayrı bir RBAC testi koşulmadı.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Her yönetici yolu için izin matrisi bu turda açılmadı.

## Madde 5

- GÖREV: Object-level access and IDOR protection
- NE İSTİYOR: Cross-customer cart/order/checkout denied
- KOD: server/__tests__/idorGuard.test.mjs
- TEST: Bu sabah geçti: yol gezintisi ve rol yükseltme reddedildi.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Müşteri sepeti/siparişi çapraz erişim bu test dosyasında yok.

## Madde 6

- GÖREV: Admin and customer session separation
- NE İSTİYOR: Distinct HttpOnly cookies; no session mix-up
- KOD: server/__tests__/adminSessionSecurity.test.mjs
- TEST: Yönetici oturumu bu sabah geçti.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Müşteri oturumu ile yönetici oturumunun ayrımı ayrıca ölçülmedi.

## Madde 7

- GÖREV: Cookie flags HttpOnly, Secure, SameSite
- NE İSTİYOR: Session cookies not readable by JS; CSRF companion token
- KOD: `server/lib/auth.js` login JSON `token` döner, Set-Cookie yazmaz. `lib/store/client.ts` tokenı `sessionStorage` içinde tutar. `server/lib/csrf.js` gelen `buzzard_csrf` çerezini okur, yazmaz. HttpOnly, Secure ve SameSite atayan kod `js/mjs/ts/tsx/py` içinde yok.
- TEST: 23 Kasım 2026 06:19 Europe/Berlin. `csrf.test.mjs` 4/4 geçti; bayrak assert etmez. `adminSessionHttp.test.mjs` 19/19 geçti. Login `set-cookie` null. Cookie ile `/api/admin/me` 401.
- ENTEGRASYON: `globalAuthMiddleware.js` CSRF okuyucusunu auth öncesine bağlar. İstemci `Authorization: Bearer` gönderir. Üretim ve geliştirme için ayrı çerez bayrağı dalı yok.
- DURUM: 🟡
- EKSİK: HttpOnly, Secure ve SameSite uygulanmıyor. Oturum tokenı `sessionStorage` içinde ve JS okuyabiliyor. CSRF eşlik çerezi sunucu tarafından set edilmiyor. Geçen testler bayrakları doğrulamıyor.

## Madde 8

- GÖREV: CSRF protection for cookie-authenticated mutations
- NE İSTİYOR: Mutating cookie session requires X-Buzzard-CSRF-Token
- KOD: server/lib/csrf.js
- TEST: CSRF kodu var. Zorlama yalnızca BUZZARD_CSRF_ENFORCE=1 iken. Bearer istek CSRF istemez. Zorunlu durumun testi bu sabah geçti.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Varsayılan kapalı. HttpOnly çerez bayrağı bulunamadı.

## Madde 9

- GÖREV: CORS origin and header policy
- NE İSTİYOR: Unlisted Origin rejected; null Origin not trusted unless listed
- KOD: server/server.js
- TEST: 24 Kasım 2026 08:33 Europe/Berlin. `corsOrigins.test.mjs` geçti. Listede olmayan origin ve `null` reddedilir. `null` yalnız `BUZZARD_CORS_ORIGINS` içindeyse kabul edilir.
- ENTEGRASYON: `server/server.js` `server/lib/corsOrigins.js` üzerinden aynı izin listesini yazar.
- DURUM: ✅
- EKSİK: Ölçüt karşılandı.

## Madde 10

- GÖREV: Production JWT secret fail-closed
- NE İSTİYOR: Empty/default JWT_SECRET throws in production
- KOD: server/lib/environmentValidation.js
- TEST: Üretimde JWT_SECRET boşsa hata metni var. jwtSecretHardening bu sabah geçti.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Bekleyen iş. Çalışan üretim süreci görülmedi. Bu madde VERIFIED değildir.

## Madde 11

- GÖREV: Rate limiting remains enabled
- NE İSTİYOR: Production cannot set RATE_LIMIT_DISABLED; health has own bucket
- KOD: server/__tests__/rateLimitStore.test.mjs
- TEST: 24 Kasım 2026 08:39 Europe/Berlin. `healthRateLimitBucket.test.mjs` geçti. Sağlık kovası 240, kullanıcı kovası 180. Sağlık taşması `/api/status` isteğini kesmedi. Kullanıcı taşması `/api/health` isteğini kesmedi. Sınırdan sonraki sağlık yolu 429 ve yalnız `security.rateLimited`.
- ENTEGRASYON: `server/server.js` mevcut `createRateLimiter` örneğini `health:` önekiyle kullanır. İkinci bir hız sistemi yok.
- DURUM: ✅
- EKSİK: Ölçüt karşılandı.

## Madde 12

- GÖREV: Feature flags sales / SoT / live payments parent-child
- NE İSTİYOR: Child commercial flags ineffective while sales off; SoT never auto-active
- KOD: server/lib/salesMode.js
- TEST: 24 Kasım 2026 08:39 Europe/Berlin. `salesChildFlags.test.mjs` 2/2. Çocuk bayraklar açıkken satış kapalı. SoT kimlik doğrulanmadan `READ_TARGET`. Bütün bayraklar açılınca ödeme `PAYMENT_NOT_LIVE`, tedarikçi `LIVE_ORDER_FORBIDDEN`.
- ENTEGRASYON: `transitionOrderStatus` ödeme, sevkiyat ve iade geçişlerini satış kapalıyken çocuk bayraktan bağımsız reddeder.
- DURUM: ✅
- EKSİK: Ölçüt karşılandı.

## Madde 13

- GÖREV: Environment validation at startup
- NE İSTİYOR: Production rejects test mode, disabled rate limit, default JWT, live payments without sales
- KOD: server/lib/environmentValidation.js
- TEST: 24 Kasım 2026 08:45 Europe/Berlin. `productionStartup.test.mjs` içinde `BUZZARD_PAYMENT_LIVE=1` ve `BUZZARD_PAYMENT_ENABLED=1` satış kapalıyken üretim sürecini 1 koduyla kapatır. Test modu, hız sınırı ve JWT redleri aynı dosyada duruyor.
- ENTEGRASYON: `configurationValidation` mevcut satış kontrolüne `BUZZARD_PAYMENT_LIVE` satırını ekler. Süreç bu hatada dinlemeye geçmez.
- DURUM: ✅
- EKSİK: Ölçüt karşılandı. Çalışan üretim sürecinin kendisi madde 10’da bekliyor.

## Madde 14

- GÖREV: Secrets redaction and secure configuration
- NE İSTİYOR: No secrets in logs/reports/commits
- KOD: server/lib/security.js
- TEST: Bu ağaçta `redact` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

## Madde 15

- GÖREV: Request validation and safe error messages
- NE İSTİYOR: Client totals rejected; public errors do not leak internals
- KOD: `server/lib/commerce/commerceValidation.js` `rejectClientTotals`. `checkoutService.js` bu kodu 400 ile döndürür. `server/lib/security.js` `publicErrorBody` yalnız `errorKey` verir. `server/server.js` yakalanan hatayı bu gövdeyle yollar, mesajı sunucu logunda tutar.
- TEST: 24 Kasım 2026 08:45 Europe/Berlin. `clientTotalsHttp.test.mjs` geçti. Oturumlu kuru prova checkout’una `total: 1` gönderildi. Cevap 400 `client_totals_rejected`. Bozuk JSON 400 `security.invalidJson`. Gövde yığın ve dosya yolu taşımıyor.
- ENTEGRASYON: `POST /api/commerce/checkout/:id/validate` `rejectClientTotals` sonucunu döndürür. `sendRequestError` `publicErrorBody` kullanır.
- DURUM: ✅
- EKSİK: Ölçüt karşılandı.

## Madde 16

- GÖREV: Guest commerce proof for cart/checkout/order
- NE İSTİYOR: Guest without session/token fail-closed
- KOD: server/plugins/ordersPlugin.js
- TEST: 11:34 Europe/Berlin. guestCheckoutFailClosed 4/4. Kimliksiz kuru prova 401. Kimliksiz sipariş okuma 401. Başka müşteri 403. Sahte token 401. Sahip ve orders.read 200. orderDryRehearsalIntegration oturumlu kuru prova 200, live false.
- ENTEGRASYON: Misafir sepet, checkout ve sipariş kapalı.
- DURUM: ✅
- EKSİK: Ölçüt karşılandı.

## Madde 17

- GÖREV: Diagnostic / Guardian / Orchestrator / DB GET protection
- NE İSTİYOR: Unauthenticated diagnostic prefixes 401
- KOD: server/plugins/aiAutomationPlugin.js
- TEST: 11:34 Europe/Berlin. diagnosticGetAuth 3/3. Guardian, Orchestrator ve DB status tokensuz 401. GET /api/health yalnız success, ok, live false ve isolated döner. Teşhis gövdesi tokensuz 401.
- ENTEGRASYON: Canlılık ucu yol ve entegrasyon dökümü vermiyor.
- DURUM: ✅
- EKSİK: Ölçüt karşılandı.

## Madde 18

- GÖREV: Data protection and durable storage design
- NE İSTİYOR: App data not persisted in /tmp; intended DB path used
- KOD: `server/lib/dbPaths.js` `defaultDbPath` ve `resolveDbPath`. `server/lib/dbStartup.js` bu yolu açar.
- TEST: 23 Kasım 2026 07:52 Europe/Berlin. `items18to33Foundation.test.mjs` 6/6. Varsayılan yol `/tmp` değil. `BUZZARD_DB_PATH` seçiliyor. `/tmp` kalıcı sayılmıyor.
- ENTEGRASYON: Yol seçimi `dbStartup.validateDatabaseStartup` üzerinden açılışa bağlı.
- DURUM: 🟡
- EKSİK: Bu makinede `/var/data` üretim süreci doğrulanmadı.

## Madde 19

- GÖREV: Project integrity: commercial locks stay off
- NE İSTİYOR: SALES, SoT, LIVE_PAYMENTS remain off; no fail-open auth wrappers
- KOD: `server/lib/salesMode.js` `isSalesEnabled`. Bypass, satış anahtarı yokken etkisiz.
- TEST: Aynı dosya. `BUZZARD_SALES_GATE_BYPASS=1` ve satış anahtarı yokken `isSalesEnabled()` false. `catalogMode` true.
- ENTEGRASYON: Katalog modu `getSalesSafetyStatus` ile aynı kilide bağlı.
- DURUM: 🟡
- EKSİK: Korunan JSON kırmızı. Bütün auth sarmalayıcıları bu turda açılmadı.

## Madde 20

- GÖREV: Shared commerce constants and state machines
- NE İSTİYOR: Checkout and order transitions enforced
- KOD: `server/core/commerceConstants.js` `canTransitionCheckout` ve `canTransitionOrder`.
- TEST: Aynı dosya. Yasal geçiş geçer, `DRAFT → COMPLETED` ve `DELIVERED → CANCELLED` reddedilir.
- ENTEGRASYON: `checkoutService.transitionCheckout` ve `orderService` bu fonksiyonu yazmadan önce çağırır.
- DURUM: 🟡
- EKSİK: Her HTTP geçişi bu turda çağrılmadı.

## Madde 21

- GÖREV: Common error contracts
- NE İSTİYOR: Public error keys without stack traces
- KOD: `server/lib/security.js` `publicErrorBody`.
- TEST: 24 Kasım 2026 08:45 Europe/Berlin. `clientTotalsHttp.test.mjs` `publicError` çağrısında mesaj, yığın ve SQL alanlarının cevapta olmadığını doğruladı.
- ENTEGRASYON: `server/core/errors.js` `publicError` artık `publicErrorBody` ile aynı iki alanı döndürür.
- DURUM: ✅
- EKSİK: Ölçüt karşılandı.

## Madde 22

- GÖREV: Cart data contract
- NE İSTİYOR: Server-owned totals; session binding
- KOD: server/lib/commerce/commerceValidation.js
- TEST: 11:34 Europe/Berlin. guestCheckoutFailClosed 4/4. Sepet yazma tokensuz 401. Madde 16’daki iki açık sözleşme kapandı.
- ENTEGRASYON: Toplam sunucuda. Oturum bağlı.
- DURUM: ✅
- EKSİK: Ölçüt karşılandı.

## Madde 23

- GÖREV: Checkout data contract
- NE İSTİYOR: Sales lock; guest proof
- KOD: `server/lib/commerce/commerceGuards.js` `catalogMode`.
- TEST: 24 Kasım 2026 11:58 Europe/Berlin. `guestDryRehearsalAccess.test.mjs`, `orderDryRehearsalIntegration.test.mjs` ve `phase6DryRehearsalRoute.test.mjs` geçti. Tokensuz ve sahte belirteç 401. Başka müşterinin e-postası cevapta yok. Ticari `POST /api/orders` 403 `sales_disabled`. Oturumlu prova `live: false`, `paymentCapture: false`. Yazılan satır ticari değil.
- ENTEGRASYON: `POST /api/orders/dry-rehearsal` `assertCommerceCredential` kullanır. Hata cevabı yalnız `security.internalError` taşır.
- DURUM: ✅
- EKSİK: Ölçüt karşılandı.

## Madde 24

- GÖREV: Order data contract
- NE İSTİYOR: Guest token stripped from public map
- KOD: `server/lib/commerce/orderService.js` `mapOrder`. `commerce_orders` şemasında token kolonu yok.
- TEST: 24 Kasım 2026 11:58 Europe/Berlin. `mapOrderPublic.test.mjs` geçti. Satırdaki misafir token, oturum tokenı ve parola eşlenen gövdede yok. `phase3.live` ve `payable` false.
- ENTEGRASYON: `mapOrder` şema alanlarını döndürür. `commerce_orders` tablosunda token kolonu yok.
- DURUM: ✅
- EKSİK: Ölçüt karşılandı.

## Madde 25

- GÖREV: Product data contract
- NE İSTİYOR: Canonical product fields via PIM core
- KOD: `server/lib/pim/productCore.js` `createProduct` ve `updateProduct`. Kapı `guardProjection`. `productService` sarmalayıcı. `pimCatalog.updateProduct` fiyat ve stok değişimini aynı çekirdeğe yollar.
- TEST: 24 Kasım 2026 12:14 Europe/Berlin. `canonicalPimWriteSafety.test.mjs` 4/4. Aktörsüz yazma `ACTOR_REQUIRED`, yapay zekâ `AI_WRITE_DENIED`. Boş SKU, negatif fiyat, sayı olmayan stok ve satış kapalıyken `ACTIVE` satır açmıyor. Çakışan EAN fiyatı ve stoku eski halinde bırakıyor. Art arda fiyat ve stok güncellemesi ikisini de tutuyor. Açık işlem sırasında ikinci bağlantı kilitleniyor. İzdüşüm fiyatı kanonik satırdan önce değişmiyor.
- ENTEGRASYON: Çalışan bir üretim süreci görülmedi. Üretim veritabanına yazılmadı. Bu madde canlı entegrasyon doğrulaması değildir.
- DURUM: ✅
- EKSİK: Ölçüt karşılandı. Katalog SEO, arama ve eski ürün tabloları oluşturma sırasında kanonik kayıttan sonra kendi satırlarını yazmaya devam ediyor. Ayrı bir ürün motoru eklenmedi.

## Madde 26

- GÖREV: Core DB schema and migrations
- NE İSTİYOR: Additive software/pusat tables
- KOD: `server/lib/db.js` `commerce_orders`. `server/lib/pusat/durableTaskQueue.js` `orch_tasks`.
- TEST: Şema bu turda okundu. Yeni migrasyon koşusu yok.
- ENTEGRASYON: Orkestratör kuyruğu kendi tablosunu açılışta kurar.
- DURUM: 🟡
- EKSİK: `server/lib/software` tabloları yok.

## Madde 27

- GÖREV: Shared quantity and total validation
- NE İSTİYOR: Negative qty and client totals rejected
- KOD: `server/lib/commerce/commerceValidation.js` `validateQuantity`. `server/lib/returnsRma.js` `createReturn` aynı kuralı yazıdan önce çağırır.
- TEST: 24 Kasım 2026 12:14 Europe/Berlin. `returnsQuantityGuard.test.mjs` 2/2. Miktar `-2` `quantity_invalid` döndürür ve `rma_returns` ile `rma_return_items` sayıları değişmez. Miktar `2` mevcut yazıcıyla kaydolur.
- ENTEGRASYON: Çalışan bir iade veya ödeme süreci görülmedi. Bu kayıt satış kapalıyken geçici test veritabanına yazıldı.
- DURUM: ✅
- EKSİK: Ölçüt karşılandı. `logistics/v5/returnsEngine.startReturn` miktar almıyor. Lojistik iade satırında miktar kolonu yok.

## Madde 28

- GÖREV: Idempotency-key plumbing
- NE İSTİYOR: Sensitive commerce operations accept Idempotency-Key
- KOD: `commerce_idempotency` tablosu. `commerceCorePlugin.js` `Idempotency-Key` başlığı.
- TEST: 24 Kasım 2026 12:30 Europe/Berlin. `localClosedSurface.test.mjs`. Aynı anahtar ikinci yükü çalıştırmadı ve ilk tutarı geri verdi. Farklı yük 409 `ORDER_IDEMPOTENCY_CONFLICT`.
- ENTEGRASYON: Geçici test veritabanı. Canlı ödeme tekrar oynatması yok.
- DURUM: ✅
- EKSİK: Ölçüt karşılandı.

## Madde 29

- GÖREV: Request correlation IDs
- NE İSTİYOR: X-Request-Id / X-Correlation-Id on API
- KOD: `server/server.js` `handleRequest`. `server/lib/operations/correlationContext.js`.
- TEST: 24 Kasım 2026 12:30 Europe/Berlin. `localClosedSurface.test.mjs`. Boşluk ve `Set-Cookie` taşıyan başlık yanıt kimliğine yazılmadı. Sunucu `req_` ve `corr_` kimliği üretti.
- ENTEGRASYON: `handleRequest` aynı `acceptId` kuralını kullanır. Canlı trafik üzerinde başlık ölçülmedi.
- DURUM: ✅
- EKSİK: Ölçüt karşılandı.

## Madde 30

- GÖREV: Software facade is not a second orchestrator
- NE İSTİYOR: server/lib/software wraps existing engines
- KOD: server/lib/software/control.js
- TEST: 11:41 Europe/Berlin. itemsSixthPass 3/3. Aktörsüz ürün yazması ACTOR_REQUIRED. Ödeme ve stok yazması aktörsüz kapalı. Okuma rolü aktör istemiyor. Yönetici rolü aktör istiyor. Fiyat, sipariş, tedarikçi ve kanonik ürün yazması kapının içinden geçiyor.
- ENTEGRASYON: Pusat fiyat ve stok okuması aynı kapıyı kullanıyor.
- DURUM: 🟡
- EKSİK: Katalog SEO, arama ve eski PIM tabloları kanonik yazıdan sonra kendi satırlarını doğrudan yazıyor. Dijital beden sağlayıcıları kapıda değil.

## Madde 31

- GÖREV: API health endpoints
- NE İSTİYOR: Health remains rate-limited on its own bucket
- KOD: `server/server.js` `healthRateLimit`, önek `health:`.
- TEST: Aynı dosya. Health kovası dolunca API kovası dolmuyor. `GET /api/health` 200.
- ENTEGRASYON: Sağlık uçları genel `api:` kovasına yazmıyor.
- DURUM: 🟡
- EKSİK: HTTP ile 240 isteklik doluluk basılmadı.

## Madde 32

- GÖREV: Plugin / route registry
- NE İSTİYOR: wrapRouteHandler on registered routes
- KOD: `server/server.js` rota kaydı `wrapRouteHandler` çağırır. `server/lib/globalAuthMiddleware.js`.
- TEST: Kayıt satırı bu turda okundu.
- ENTEGRASYON: Eşleşen rota, izin çözücüsünden geçen sarmalayıcıya gider.
- DURUM: 🟡
- EKSİK: Her rotanın sarıldığı ayrı envanter testi yok.

## Madde 33

- GÖREV: Catalog vs commerce mode split
- NE İSTİYOR: Sales off => catalog mode
- KOD: `getSalesSafetyStatus().catalogMode`.
- TEST: Aynı dosya. Satış kapalıyken katalog modu true.
- ENTEGRASYON: Ticari işlemler satış kapısında durur.
- DURUM: 🟡
- EKSİK: Vitrindeki her ticari uç bu turda yeniden çağrılmadı.

## Madde 34

- GÖREV: Core shared-service test harness
- NE İSTİYOR: Vitest unit suite for commerce core
- KOD: `server/__tests__/items18to33Foundation.test.mjs` ve mevcut commerce Vitest dosyaları.
- TEST: 23 Kasım 2026 07:52 Europe/Berlin, 6/6.
- ENTEGRASYON: Test, çalışan `dbPaths`, satış kilidi ve sağlık ucuna bağlı.
- DURUM: 🟡
- EKSİK: Ekim 237 kemeri bu dalda yok. phase1 yüzde 91.7.

## Madde 35

- GÖREV: Pusat orchestrator core
- NE İSTİYOR: Initialize, dispatch, health
- KOD: server/__tests__/pusatOrchestrator.test.mjs
- TEST: 23 Kasım 2026 07:53 Europe/Berlin. `pusatOrchestrator.test.mjs` 11/11. Fiyat hesabı, onay kapısı, bağımlılık, 17 kimlik, kuru ray ve yeniden başlatma sonrası canlı stok reddi geçti. Canlı model yok.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Canlı model yok.

## Madde 36

- GÖREV: Agent registry and coordination
- NE İSTİYOR: Employee/agent registry
- KOD: `server/lib/buzzardNative/core/identityRegistry.js` `getAgent`. `specialistDispatch.js` `AGENT_KINDS`. `special16Runtime.js` yalnızca yeniden dışa aktarır.
- TEST: 23 Kasım 2026 08:15 Europe/Berlin. `pricing_ai` kaydı ve en az 17 ajan türü doğrulandı.
- ENTEGRASYON: Kayıt, `dispatch` ile aynı kimlik tablosunu kullanır.
- DURUM: 🟡
- EKSİK: Çalışan kadro ile görev atama uçtan uca bu maddede ayrıca koşulmadı.

## Madde 37

- GÖREV: Central AI memory
- NE İSTİYOR: Host/kv style memory in Pusat
- KOD: `server/lib/pusat/durable.js` `putMemory` / `getMemory`.
- TEST: 23 Kasım 2026 08:15 Europe/Berlin. Sahibi okur. Başka ajan `PERSONAL_MEMORY_DENIED` alır. `pusatCouncil.test.mjs` 6/6 aynı sabah geçti.
- ENTEGRASYON: Bellek geçici SQLite dosyasında. Host/kv servisi yok.
- DURUM: 🟡
- EKSİK: Ayrı bir Host/kv süreci yok. Süreçler arası kanıt madde 53'te.

## Madde 38

- GÖREV: Specialist agents
- NE İSTİYOR: Named agents with tools
- KOD: `AGENT_KINDS.pricing_ai` içinde `PRICE_CALCULATE`. `stock_ai` içinde `STOCK_BUY`.
- TEST: 23 Kasım 2026 08:15 Europe/Berlin. İki araç listede. `THINK` çağrısı `llmCompleted: false`.
- ENTEGRASYON: `dispatch` kural motoru. Canlı model yok.
- DURUM: 🟡
- EKSİK: 17 kimliğin her aracı bu turda tek tek çağrılmadı.

## Madde 39

- GÖREV: Task orchestration
- NE İSTİYOR: Tasks wait on approval
- KOD: `server/lib/pusat/durableTaskQueue.js` `enqueue({ needsApproval: true })`. İlk turdaki `whatsappSandbox.js` bu kuyruk değil.
- TEST: 23 Kasım 2026 08:15 Europe/Berlin. Durum `BLOCKED_APPROVAL`. `complete` `BLOCKED_APPROVAL` döner.
- ENTEGRASYON: Onay satırı `orch_approvals`.
- DURUM: 🟡
- EKSİK: WhatsApp kum havuzu bu maddenin kuyruğu değil.

## Madde 40

- GÖREV: Pusat error handling fail-closed
- NE İSTİYOR: Exceptions classified; payments not retried
- KOD: `server/lib/pusat/runtime.js`. `CAPTURE_PAYMENT` yazma listesinde. İstisna `retryable: false`.
- TEST: 24 Kasım 2026 12:30 Europe/Berlin. `localClosedSurface.test.mjs`. `CAPTURE_PAYMENT` dönüşü `PERMISSION_DENIED`, `retryable: false`, `live: false`.
- ENTEGRASYON: Canlı ödeme yok. Diğer istisna sınıflarının tamamı bu çağrıda sayılmadı.
- DURUM: ✅
- EKSİK: Ölçüt karşılandı.

## Madde 41

- GÖREV: AI governance: cannot self-approve
- NE İSTİYOR: decide() rejects requesting agent / AI identity
- KOD: `humanApproval.submit` ajan kimliğini `identityRegistry.ids` ile tanır ve kuyruğa yazar. `controlCenter.decideApproval` aynı kimlikleri reddeder.
- TEST: 24 Kasım 2026 12:30 Europe/Berlin. `items36to55Pusat.test.mjs` ve `localClosedSurface.test.mjs`. `pricing_ai` düşük riski `WAITING_APPROVAL`. İnsan düşük riski `policy:low-risk`. Ajan kararı onay satırını `PENDING` bırakır.
- ENTEGRASYON: İki onay kaydı duruyor. Canlı kadro kararı yok.
- DURUM: ✅
- EKSİK: Ölçüt karşılandı.

## Madde 42

- GÖREV: Dispatch idempotency
- NE İSTİYOR: Durable read-only dispatch keys
- KOD: `server/lib/pusat/idempotencyService.js`.
- TEST: 23 Kasım 2026 08:14 Europe/Berlin. `pusatIdempotency.test.mjs` 6/6. Aynı yük yeniden çalışmaz. Farklı yük reddedilir. Satış ve münhasır SoT açılmaz.
- ENTEGRASYON: `pusat_idempotency` tablosu. `core_ai_tasks` kolonları değişmedi.
- DURUM: 🟡
- EKSİK: Anahtarlar bu turda süreç kapatılıp aynı dosyadan tekrar açılmadı.

## Madde 43

- GÖREV: Worker integration
- NE İSTİYOR: Pusat worker hooks
- KOD: `durableTaskQueue.registerWorker`, `heartbeat`, `health().workers`.
- TEST: 23 Kasım 2026 08:15 Europe/Berlin. Kayıt ve nabız geçer. `workers.live` false.
- ENTEGRASYON: Kanca yerel SQLite. Barındırılan fabrika yok.
- DURUM: 🟡
- EKSİK: Çalışan bir işçi süreci yok. `hostedFactory` false.

## Madde 44

- GÖREV: Agent approval requests
- NE İSTİYOR: requestApproval bound to input hash
- KOD: `server/lib/buzzardNative/core/specialists/brandDraft.js` `requestApproval`. Dönüş `HUMAN_GATE_REQUIRED`. Gövde özeti yok.
- TEST: Bu madde için ayrı bir hash testi yok. Onay kuyruğu madde 39 ve 41 testinde geçti.
- ENTEGRASYON: İstek, girdi özetine bağlanmıyor.
- DURUM: 🟡
- EKSİK: Girdi hash bağı yok. Uydurma hash eklenmedi.

## Madde 45

- GÖREV: Pusat exception dead-letter
- NE İSTİYOR: Retry then DEAD_LETTER
- KOD: `durableTaskQueue.fail`. Kira `attempts` artırır. Sınırda `DEAD_LETTER` ve `orch_dead`.
- TEST: 23 Kasım 2026 08:15 Europe/Berlin. `maxAttempts: 1` ilk hatada `DEAD_LETTER`. `maxAttempts: 2` önce `QUEUED`, ikinci hatada `DEAD_LETTER`.
- ENTEGRASYON: Aynı kuyruk dosyası.
- DURUM: 🟡
- EKSİK: Ödeme istisnası bu kuyruğa ayrıca bağlanmadı.

## Madde 46

- GÖREV: Memory and Guardian tests
- NE İSTİYOR: Guardian deny + memory tests
- KOD: `durable.js` `PERSONAL_MEMORY_DENIED`. Guardian URL yapılandırılmadı.
- TEST: 23 Kasım 2026 08:15 Europe/Berlin. Bellek reddi geçti. Guardian durum ucu madde 17 testinde tokensuz 401.
- ENTEGRASYON: Guardian upstream `configured: false`.
- DURUM: 🟡
- EKSİK: Canlı Guardian kararı yok.

## Madde 47

- GÖREV: Stub vs live LLM providers
- NE İSTİYOR: Stub default; live not claimed
- KOD: `specialistDispatch.dispatch`. `dispatchVerify.js` `llmCompleted === true` ise `LLM_CLAIM_REJECTED`.
- TEST: 23 Kasım 2026 08:15 Europe/Berlin. `pricing_ai` THINK `llmCompleted: false`, `live: false`.
- ENTEGRASYON: Sağlayıcı çağrısı yok.
- DURUM: 🟡
- EKSİK: Canlı sağlayıcı anahtarı yok. Canlı iddia edilmedi.

## Madde 48

- GÖREV: AI tool rate limit
- NE İSTİYOR: Guardian per-agent rate window
- KOD: server/lib/security/agentRateWindow.js
- TEST: 11:21 Europe/Berlin. Aynı ajanın ikinci executeReadOnly çağrısı AGENT_RATE_LIMITED, live false.
- ENTEGRASYON: Pusat yürütmesi pencereyi ajan kimliğiyle tüketiyor.
- DURUM: ✅
- EKSİK: Uzak Guardian adresi hâlâ yapılandırılmadı. Pencere yerel.

## Madde 49

- GÖREV: Agent isolation via permissions
- NE İSTİYOR: aiCanExecute + tool allow-list
- KOD: `server/lib/rbac.js` `aiCanExecute`. Araç listesi `AGENT_KINDS`.
- TEST: 23 Kasım 2026 08:15 Europe/Berlin. `ai.read` ile `ai.execute` false. `rbac.test.mjs` 6/6, 08:14.
- ENTEGRASYON: İzin listesi çalışan kaydı. Araç listesi dispatch kapısı.
- DURUM: 🟡
- EKSİK: Her ajanın izin profili bu turda tek tek eşlenmedi.

## Madde 50

- GÖREV: Sensitive action classification
- NE İSTİYOR: SENSITIVE_ACTIONS require approval
- KOD: `humanApproval.js`. HIGH ve üstü kuyruğa `WAITING_APPROVAL`. LOW otomatik.
- TEST: 23 Kasım 2026 08:15 Europe/Berlin. `CAPTURE_PAYMENT` yüksek risk bekler. `READ` düşük risk otomatik onaylanır.
- ENTEGRASYON: Ayrı bir `SENSITIVE_ACTIONS` sabiti bu fonksiyonda yok. Risk alanı kullanılıyor.
- DURUM: 🟡
- EKSİK: Düşük risk onaysız geçer. Sabit adlı bir hassas-eylem listesi bu turda doğrulanmadı.

## Madde 51

- GÖREV: Orchestrator HTTP protection
- NE İSTİYOR: GET /api/orchestrator prefix authenticated
- KOD: `server/plugins/orchestratorBridgePlugin.js`. Üç GET: `/status`, `/agents`, `/tasks`. Hepsi `requireAuth`.
- TEST: 23 Kasım 2026 08:15 Europe/Berlin. `diagnosticGetAuth.test.mjs` 3/3. Tokensuz üç uç 401. Yönetici oturumu status 200, `configured: false`.
- ENTEGRASYON: Aynı önek altında başka GET yok.
- DURUM: ✅
- EKSİK: Upstream orchestrator yapılandırılmadı. Bu, kimlik kuralının dışında.

## Madde 52

- GÖREV: Automations non-destructive
- NE İSTİYOR: No autonomous money movement
- KOD: `runtime.js` `CAPTURE_PAYMENT` reddi. `pricingIntegration.applyPriceChange` AI için `AI_PRICE_WRITE_DENIED`.
- TEST: 23 Kasım 2026 08:15 Europe/Berlin. İkisi de geçti. Satış kapalı.
- ENTEGRASYON: Otomasyon para yazmıyor.
- DURUM: 🟡
- EKSİK: Banka ve iade yollarının tamamı bu maddede yeniden çağrılmadı.

## Madde 53

- GÖREV: Cross-process memory proof
- NE İSTİYOR: Documented in AI completion
- KOD: `durable.js` belleği SQLite satırına yazar.
- TEST: 23 Kasım 2026 08:15 Europe/Berlin. Tek süreçte yazıp okuma geçti. İkinci süreç açılmadı.
- ENTEGRASYON: AI completion belgesinde süreçler arası kanıt cümlesi bulunmadı.
- DURUM: 🟡
- EKSİK: Süreç kapatılıp aynı dosyadan ikinci okuma yok. Belge kanıtı yok.

## Madde 54

- GÖREV: Recommendation-only assistants
- NE İSTİYOR: Cannot execute commercial side effects
- KOD: `pricingIntegration.quotePrice` `recommendationOnly: true`. `applyPriceChange` AI yazmayı reddeder.
- TEST: 23 Kasım 2026 08:15 Europe/Berlin. İkisi de geçti.
- ENTEGRASYON: Fiyat yazması ürün servisine yalnız insan, izin ve onay ile gider. O dal çağrılmadı.
- DURUM: 🟡
- EKSİK: Stok alımı ve iade kapıları bu maddede yeniden koşulmadı.

## Madde 55

- GÖREV: Pusat health/status
- NE İSTİYOR: Health reports stub/live honestly
- KOD: `runtime.health`. `live` sabit false. Kuyruk `workers.live` false.
- TEST: 23 Kasım 2026 08:15 Europe/Berlin. İkisi de false.
- ENTEGRASYON: Sağlık, etkin bayrağı canlı model saymaz.
- DURUM: 🟡
- EKSİK: Canlı sağlayıcı bağlandığında sağlık cümlesi ayrıca doğrulanmadı. Canlı bağ yok.

## Madde 56

- GÖREV: Canonical product model
- NE İSTİYOR: productCore create/read
- KOD: `server/lib/pim/productCore.js` `createProduct` / `getProduct`.
- TEST: 23 Kasım 2026 08:18 Europe/Berlin. `items56to84Catalog.test.mjs` 5/5. SKU yazıldı ve aynı id ile okundu. Durum `DRAFT`.
- ENTEGRASYON: Geçici SQLite. `BUZZARD_PRODUCT_SOT_ACTIVE=1` iken `isSotActive()` false.
- DURUM: ✅
- EKSİK: Yok. Kabul cümlesi oluşturma ve okuma.

## Madde 57

- GÖREV: PIM write boundary
- NE İSTİYOR: authorizeCreate/Update/Delete; actor from session
- KOD: server/lib/pim/productAuthorization.js
- TEST: 11:21 Europe/Berlin. Oturumsuz ACTOR_REQUIRED. Oturum e-postası aktör. Plugin create ve update bu sonucu kullanıyor.
- ENTEGRASYON: Gövdeden aktör alınmıyor.
- DURUM: ✅
- EKSİK: Ölçüt karşılandı.

## Madde 58

- GÖREV: Customer-facing taxonomy L1
- NE İSTİYOR: 50 customer L1 categories
- KOD: `hubSeoLocaleService.validateHubSeoCoverage`. `phase2CategoryInfrastructure`.
- TEST: 23 Kasım 2026 08:18 Europe/Berlin. `activeHubs` 50, `missingPrimary` boş. `phase2CategoryInfrastructure.test.mjs` 1/1, `master50` 50, `templateL1` 50, `completeClaim` false.
- ENTEGRASYON: Yazılım şablonu. Canlı müşteri vitrini bu testte açılmadı.
- DURUM: 🟡
- EKSİK: `completeClaim` false. Müşteri vitrininde 50 kutu ayrıca sayılmadı.

## Madde 59

- GÖREV: Category localization
- NE İSTİYOR: DE/EN/TR/AR labels
- KOD: `PRIMARY` de, en, tr, ar. `productValidator.VALID_LOCALES` aynı dördü.
- TEST: 23 Kasım 2026 08:18 Europe/Berlin. İkisi de geçti. Kapsam `completeClaim` false.
- ENTEGRASYON: Hub etiketleri manifestte. Çeviri iddiası yok.
- DURUM: 🟡
- EKSİK: Her ürün satırının dört dili bu turda doldurulmadı.

## Madde 60

- GÖREV: Product validation
- NE İSTİYOR: PIM validation / customs decision
- KOD: `productValidator.validateProduct` içinde `validateCustoms`.
- TEST: 23 Kasım 2026 08:18 Europe/Berlin. Güven 0.2 iken `review_required` true. Menşe `DE`.
- ENTEGRASYON: Doğrulama yerel. Canlı gümrük servisi yok.
- DURUM: 🟡
- EKSİK: Ayrı bir gümrük karar motoru çağrılmadı.

## Madde 61

- GÖREV: Product SoT readiness while inactive
- NE İSTİYOR: activationStatus.activated false even if env flag
- KOD: `activationStatus` sembolü yok. `productSot.isSotActive` hem aktif hem münhasır bayrak ister.
- TEST: 23 Kasım 2026 08:18 Europe/Berlin. Yalnız `BUZZARD_PRODUCT_SOT_ACTIVE=1` iken `isSotActive()` false.
- ENTEGRASYON: Ürün yine de taslak yazıldı. Kaynak tekliği açılmadı.
- DURUM: 🟡
- EKSİK: Adı geçen `activationStatus.activated` alanı yok.

## Madde 62

- GÖREV: Dual-write forbidden
- NE İSTİYOR: assertNoDualWrite throws
- KOD: server/lib/productSot.js
- TEST: 11:21 Europe/Berlin. assertNoDualWrite iki hedefte DUAL_WRITE_FORBIDDEN fırlatıyor. productService.createProduct aynı hatayı veriyor.
- ENTEGRASYON: Tek hedef D yazılıyor.
- DURUM: ✅
- EKSİK: Ölçüt karşılandı.

## Madde 63

- GÖREV: SKU uniqueness
- NE İSTİYOR: productStore uniqueness
- KOD: `productCore.createProduct` `productIdentifiers.assertUnique`.
- TEST: 23 Kasım 2026 08:18 Europe/Berlin. Aynı SKU ikinci kez yazılınca istisna.
- ENTEGRASYON: `pim_core_products`. Ayrı bir `productStore` dosyası bu testte yok.
- DURUM: 🟡
- EKSİK: `productStore` adı bu ağaçta ayrıca doğrulanmadı.

## Madde 64

- GÖREV: Catalog SEO
- NE İSTİYOR: createProduct active=0
- KOD: `createProduct` durum vermezse `PRODUCT_STATUS.DRAFT` ve görünürlük `HIDDEN`.
- TEST: 23 Kasım 2026 08:18 Europe/Berlin. Okunan durum `DRAFT`.
- ENTEGRASYON: `active=0` kolonu yok.
- DURUM: 🟡
- EKSİK: Kabul cümlesindeki `active=0` alanı yok. Taslak, yayında değil.

## Madde 65

- GÖREV: JSON product store
- NE İSTİYOR: Optional BUZZARD_PRODUCT_STORE_PATH
- KOD: server/lib/pim/productJsonStore.js
- TEST: 11:21 Europe/Berlin. Yol yokken kapalı. Geçici yolda active 0. Depo data yolu PRODUCT_STORE_PATH_PROTECTED.
- ENTEGRASYON: İsteğe bağlı JSON yolu.
- DURUM: ✅
- EKSİK: Ölçüt karşılandı.

## Madde 66

- GÖREV: PIM import dry-run
- NE İSTİYOR: No live import without flag
- KOD: `CsvSupplierAdapter.fetchProducts` ağı bloke eder. `phase3` `PIM_LIVE_PUBLISH` `BLOCKED_EXTERNAL`.
- TEST: 23 Kasım 2026 08:18 Europe/Berlin. Canlı okuma reddedildi. `phase3ProductPim.test.mjs` 1/1, `liveImport` false, `completeClaim` false.
- ENTEGRASYON: Kuru okuma `live: false`.
- DURUM: 🟡
- EKSİK: Canlı içe aktarma bayrağı açıkken red ayrıca denenmedi.

## Madde 67

- GÖREV: PIM publish gated
- NE İSTİYOR: Publish not SoT activation
- KOD: `productSot.isSotActive`.
- TEST: 23 Kasım 2026 08:18 Europe/Berlin. Ürün oluştu, kaynak tekliği false.
- ENTEGRASYON: Yayın ile SoT aynı anahtar değil.
- DURUM: 🟡
- EKSİK: Yayın ucu HTTP ile çağrılmadı.

## Madde 68

- GÖREV: Storefront catalog read
- NE İSTİYOR: catalogCache / catalogReadService
- KOD: `server/lib/storefront/catalogReadService.js`. Sepet servisi onu ister.
- TEST: Bu turda `getHealth` çağrılmadı.
- ENTEGRASYON: Modül duruyor. Önbellek sağlığı ölçülmedi.
- DURUM: 🟡
- EKSİK: Okuma servisi bu turda çalıştırılmadı.

## Madde 69

- GÖREV: Search index local
- NE İSTİYOR: sync-search-index; not live OpenSearch
- KOD: `scripts/sync-search-index.mjs`. Hedef `srch_products`. OpenSearch yok.
- TEST: 23 Kasım 2026 08:20 Europe/Berlin. `items69to86LocalCatalog.test.mjs` 3/3. Betik metninde OpenSearch yok.
- ENTEGRASYON: Yerel SQLite. Betik katalog dosyasına bu turda çalıştırılmadı.
- DURUM: 🟡
- EKSİK: Betik koşulmadı. `data/buzzard_products.json` değiştirilmedi.

## Madde 70

- GÖREV: Product i18n
- NE İSTİYOR: fill-product-i18n-gaps
- KOD: `scripts/fill-product-i18n-gaps.mjs`. `--dry-run`. Görsel değiştirmez.
- TEST: 23 Kasım 2026 08:20 Europe/Berlin. Betik metni doğrulandı. Çalıştırılmadı.
- ENTEGRASYON: Katalog JSON. Satış açmaz.
- DURUM: 🟡
- EKSİK: Boşluk doldurma bu turda koşulmadı.

## Madde 71

- GÖREV: Customs validation on products
- NE İSTİYOR: validateCustomsDecision
- KOD: `validateCustomsDecision` yok. `productValidator.validateProduct` gümrük alanını taşır.
- TEST: 23 Kasım 2026 08:18 Europe/Berlin. Güven 0.2 `review_required`. Adı geçen fonksiyon bu turda da yok.
- ENTEGRASYON: Yerel doğrulama.
- DURUM: 🟡
- EKSİK: `validateCustomsDecision` uygulanmamış. Yakın doğrulayıcı var.

## Madde 72

- GÖREV: Catalog / PIM health
- NE İSTİYOR: pimCatalog plugin health
- KOD: `server/plugins/pimCatalogPlugin.js`. `pimCatalog.isEnabled`.
- TEST: 23 Kasım 2026 08:20 Europe/Berlin. Etkin true. Eklentide `/api/pim-catalog/health` yok.
- ENTEGRASYON: Katalog uçları var. Sağlık ucu yok.
- DURUM: 🟡
- EKSİK: Ayrı sağlık ucu yok.

## Madde 73

- GÖREV: SoT activation remains human-gated
- NE İSTİYOR: humanApprovalRequired true
- KOD: `operationsPlane.runDryRun` `humanApprovalRequired: true`. `evaluateSalesGate` kilitli.
- TEST: 23 Kasım 2026 08:20 Europe/Berlin. İkisi de geçti. `live` false. Gerçek siparişe bağlı değil.
- ENTEGRASYON: SoT bayrağı tek başına satışı açmaz.
- DURUM: 🟡
- EKSİK: İnsan onayının SoT yazmasına bağlandığı bir uç bu turda çağrılmadı.

## Madde 74

- GÖREV: No invented live prices or images
- NE İSTİYOR: Catalog mode; no fake LIVE_VERIFIED prices
- KOD: `sinanDurable.setStatus`. `LIVE_VERIFIED` yasak.
- TEST: 23 Kasım 2026 08:20 Europe/Berlin. Dönüş `LIVE_VERIFIED_FORBIDDEN`.
- ENTEGRASYON: Katalog modu. Uydurma canlı fiyat yok.
- DURUM: 🟡
- EKSİK: Vitrin fiyatlarının tamamı bu maddede taranmadı.

## Madde 75

- GÖREV: Pricing engine
- NE İSTİYOR: server/lib/pricing.js
- KOD: `server/lib/pricing.js` `calculateSalePrice`. Kurallar ayrıca `server/lib/commerce/pricingPolicy.js`.
- TEST: 23 Kasım 2026 08:18 Europe/Berlin. `pricingPolicy.evaluateOffer` geçti. `phase5PricingProfit.test.mjs` 3/3. `pricing.js` bu komutta çağrılmadı.
- ENTEGRASYON: İki fiyat modülü var. İkisi de satış açmaz.
- DURUM: 🟡
- EKSİK: `pricing.js` satış hesabı bu turda koşulmadı.

## Madde 76

- GÖREV: Profit calculation / MIN_NET_PROFIT
- NE İSTİYOR: MIN_NET_PROFIT_EUR 0.50
- KOD: `pricingPolicy.MIN_NET_PROFIT_EUR` 0.5.
- TEST: 23 Kasım 2026 08:18 Europe/Berlin. 0.20 kâr `MIN_NET_PROFIT` ile reddedildi. `livePriceWrite` false.
- ENTEGRASYON: Teklif tavsiye. Fiyat yazılmadı.
- DURUM: ✅
- EKSİK: Yok. Taban 0.50 EUR ve altı reddediliyor.

## Madde 77

- GÖREV: Supplier integration framework
- NE İSTİYOR: Connector inventory; no real PO
- KOD: `supplierSafetyGate.isSupplierOrdersBlocked`. `CsvSupplierAdapter`.
- TEST: 23 Kasım 2026 08:18 Europe/Berlin. Satış kapalı ve sipariş bayrağı 1 iken sipariş kapalı. Canlı okuma fırlatır.
- ENTEGRASYON: Gerçek satınalma emri yok.
- DURUM: 🟡
- EKSİK: Bütün bağlayıcı envanteri tek tek listelenmedi.

## Madde 78

- GÖREV: Supplier normalization
- NE İSTİYOR: Feed dry-run CSV/XML/JSON
- KOD: `supplierImportPipeline.importSupplierFeed`.
- TEST: 23 Kasım 2026 08:18 Europe/Berlin. CSV biçimli kayıt `pimWrite` false, `live` false.
- ENTEGRASYON: Ham CSV, XML ve JSON dosyası ayrıştırılmadı. Alan normalleştirildi.
- DURUM: 🟡
- EKSİK: Üç dosya biçiminin ham ayrıştırması yok.

## Madde 79

- GÖREV: Inventory synchronization (local)
- NE İSTİYOR: stockEngine
- KOD: `server/lib/buzzardNative/core/specialists/stockEngine.js` `inspectFeeds`.
- TEST: 23 Kasım 2026 08:18 Europe/Berlin. Bayat ve sayı olmayan stok satılamaz. `liveSupplierApi` false.
- ENTEGRASYON: Yerel kural. Depo stoğu yok.
- DURUM: 🟡
- EKSİK: `operations/stockEngine.js` yolu yok. Uzman motoru var.

## Madde 80

- GÖREV: Supplier availability
- NE İSTİYOR: Adapter class / mock
- KOD: `CsvSupplierAdapter`. `networkBlocked` true. `canGoLive` false.
- TEST: 23 Kasım 2026 08:18 Europe/Berlin. `fetchProducts` reddedildi. Kuru okuma `live` false.
- ENTEGRASYON: Örnek kayıt. Dış hesap yok.
- DURUM: 🟡
- EKSİK: Her tedarikçi sınıfı çağrılmadı.

## Madde 81

- GÖREV: Shipping cost calculation local
- NE İSTİYOR: shippingProvider stubs
- KOD: `shippingProvider.calculateShipping`.
- TEST: 23 Kasım 2026 08:18 Europe/Berlin. EUR, `dryRun` true, `shipmentCreated` false. `realShipmentEnabled` false.
- ENTEGRASYON: Sabit tablo. Taşıyıcı çağrısı yok.
- DURUM: 🟡
- EKSİK: Ağırlık ve posta kodu tarifesi bu fonksiyonda yok.

## Madde 82

- GÖREV: Pricing safeguards / no undercut
- NE İSTİYOR: MARKET_UNDERCUT_IMPLEMENTED false
- KOD: `MARKET_UNDERCUT_IMPLEMENTED` yok. `pricingPolicy` `ABOVE_UNDERCUT_TARGET` ve `livePriceWrite: false`.
- TEST: 23 Kasım 2026 08:18 Europe/Berlin. 80 EUR, pazar 90 iken undercut nedeni yok. Canlı fiyat yazması false.
- ENTEGRASYON: Tavsiye kuralı. Vitrin fiyatı kesilmedi.
- DURUM: 🟡
- EKSİK: Adı geçen bayrak yok.

## Madde 83

- GÖREV: Supplier feeds dry-run only
- NE İSTİYOR: No live fetch
- KOD: `DryRunSupplierAdapter.fetchProducts` ve `importSupplierFeed`.
- TEST: 23 Kasım 2026 08:18 Europe/Berlin. Canlı okuma bloke. Besleme `live` false.
- ENTEGRASYON: Ağ kapalı.
- DURUM: 🟡
- EKSİK: Dış besleme URL'si yok. Olmaması doğru.

## Madde 84

- GÖREV: No real purchase orders
- NE İSTİYOR: supplierOrdersEnabled false
- KOD: `isSupplierOrdersBlocked`. Satış kapalıyken sipariş bayrağı etkisiz.
- TEST: 23 Kasım 2026 08:18 Europe/Berlin. `BUZZARD_SUPPLIER_ORDERS_ENABLED=1` ve satış 0 iken true.
- ENTEGRASYON: Gerçek satınalma emri oluşmadı.
- DURUM: 🟡
- EKSİK: `commerceFeatureFlags.supplierOrdersEnabled` bu testte okunmadı.

## Madde 85

- GÖREV: Stock engine
- NE İSTİYOR: operations/stockEngine.js
- KOD: `operations/stockEngine.js` yok. `specialists/stockEngine.js` `inspectFeeds` var.
- TEST: 23 Kasım 2026 08:18 Europe/Berlin. Bayat stok satılamaz. `liveSupplierApi` false.
- ENTEGRASYON: Uzman kuralı. Operasyon dosyası yok.
- DURUM: 🟡
- EKSİK: İstenen `operations/stockEngine.js` yolu yok.

## Madde 86

- GÖREV: WMS reserve vs software reserve
- NE İSTİYOR: Two tables; shared audit only
- KOD: `wms_reservations` ve `inventory_sot_reservations`.
- TEST: 23 Kasım 2026 08:20 Europe/Berlin. İki tablo aynı geçici veritabanında duruyor.
- ENTEGRASYON: Ayrı tablolar. Ortak denetim yazısı bu turda eşlenmedi.
- DURUM: 🟡
- EKSİK: Paylaşılan denetim kaydı doğrulanmadı.

## Madde 87

- GÖREV: Inter-Cars adapter class
- NE İSTİYOR: Sandbox/mock; no live order
- KOD: server/lib/adapters/interCarsAdapter.js
- TEST: 11:21 Europe/Berlin. placeOrder LIVE_ORDER_FORBIDDEN, orderCreated false, live false.
- ENTEGRASYON: Kum havuzu. Ağ çağrısı yok.
- DURUM: ✅
- EKSİK: Canlı Inter Cars hesabı yok. Sipariş yolu kapalı.

## Madde 88

- GÖREV: TecDoc adapter class
- NE İSTİYOR: Classification / adapter
- KOD: server/lib/adapters/tecdocAdapter.js
- TEST: 11:41 Europe/Berlin. itemsSixthPass. fetchCatalog mock true ve records boş. liveRequirements live false, accountVerified false. Gerekli ortam adları TECDOC_API_KEY, TECDOC_PROVIDER_ID, TECDOC_CATALOG_COUNTRY.
- ENTEGRASYON: Canlı çağrı yok.
- DURUM: ⛔
- EKSİK: TecDoc hesabı, sağlayıcı kimliği ve katalog ülkesi doğrulanmadı.

## Madde 89

- GÖREV: Price snapshot on cart
- NE İSTİYOR: priceSnapshot field
- KOD: `commerceValidation.computeOrderTotals` `priceSnapshot` kullanır. `detectPriceTampering` müşteri fiyatını sunucu fiyatıyla karşılaştırır.
- TEST: 23 Kasım 2026 10:51 Europe/Berlin. `items89to115Commerce.test.mjs` 3/3. 12.50 anlık fiyat, adet 2, ara toplam 25. Müşteri fiyatı 1 `price_tampering`.
- ENTEGRASYON: Sepet servisi aynı alanı yazar. Bu turda yeni sepet satırı açılmadı.
- DURUM: 🟡
- EKSİK: HTTP sepet satırı bu maddede yeniden yazılmadı.

## Madde 90

- GÖREV: Currency handling
- NE İSTİYOR: Market currency
- KOD: `computeOrderTotals` ve `calculateTax` para birimi EUR.
- TEST: 23 Kasım 2026 10:51 Europe/Berlin. Toplam ve DE vergi EUR.
- ENTEGRASYON: Pazar kaydı ayrı. Varsayılan EUR.
- DURUM: 🟡
- EKSİK: 35 pazarın her para birimi bu maddede listelenmedi.

## Madde 91

- GÖREV: Market price rules
- NE İSTİYOR: Per-market config
- KOD: `taxProvider.VAT_BY_COUNTRY`. `quoteForMarket` yok.
- TEST: 23 Kasım 2026 10:51 Europe/Berlin. DE 19. Bilinmeyen ülke `tax_rate_unknown` ve blocked.
- ENTEGRASYON: Sekiz ülke. Pazar motoru fiyatı yok.
- DURUM: 🟡
- EKSİK: `quoteForMarket` uygulanmamış.

## Madde 92

- GÖREV: Supplier connector inventory honesty
- NE İSTİYOR: class NOT_IMPLEMENTED where true
- KOD: `engineContract.notImplemented`. `evaluateCapabilityMatrix` sipariş yeteneği desteklemez. `canGoLive` false.
- TEST: 23 Kasım 2026 10:51 Europe/Berlin. `NOT_IMPLEMENTED`. ORDERS supported false.
- ENTEGRASYON: Sahte başarı yok.
- DURUM: 🟡
- EKSİK: Her bağlayıcı sınıfı tek tek envantere dökülmedi.

## Madde 93

- GÖREV: Supplier retry/idempotency
- NE İSTİYOR: Fail-closed outage
- KOD: Tedarikçi sipariş yeteneği kapalı. Ağ okuması madde 83'te bloke.
- TEST: 23 Kasım 2026 10:51 Europe/Berlin. ORDERS false ve `canGoLive` false.
- ENTEGRASYON: Kesinti stoğa çevrilmiyor.
- DURUM: 🟡
- EKSİK: Tedarikçi yeniden deneme sayacı ayrıca yok.

## Madde 94

- GÖREV: Fail-closed supplier outage
- NE İSTİYOR: Malformed/outage not treated as stock
- KOD: `stockEngine.inspectFeeds`. Sayı olmayan miktar satılamaz.
- TEST: 23 Kasım 2026 10:51 Europe/Berlin. `sellable` false. `liveSupplierApi` false.
- ENTEGRASYON: Bozuk besleme stok sayılmıyor.
- DURUM: 🟡
- EKSİK: HTTP kesinti gövdesi ayrıca çağrılmadı.

## Madde 95

- GÖREV: Cart service
- NE İSTİYOR: Session-bound writes
- KOD: `cartService` yazmadan önce `authorizeCartWrite`. Fiyat `priceSnapshot`.
- TEST: 23 Kasım 2026 10:51 Europe/Berlin. Sunucu fiyatı müşteri fiyatını ezer. Kimlik kapısı madde 16 testinde duruyor.
- ENTEGRASYON: Oturumsuz yazı madde 16'da 401.
- DURUM: 🟡
- EKSİK: Bu turda sepet HTTP'si yeniden koşulmadı. İki vitrin sözleşmesi duruyor.

## Madde 96

- GÖREV: Checkout service
- NE İSTİYOR: Sales lock + guest proof
- KOD: `isSalesEnabled` false. Checkout satış kapalıyken madde 16'da 403.
- TEST: 23 Kasım 2026 10:51 Europe/Berlin. Satış kapalı. Yakalama `PAYMENT_NOT_LIVE`.
- ENTEGRASYON: Misafir kanıtı madde 16.
- DURUM: 🟡
- EKSİK: Kuru prova ve kimliği gizlenmiş sipariş okuması duruyor.

## Madde 97

- GÖREV: Order service
- NE İSTİYOR: skipAccessCheck only internal
- KOD: server/lib/commerce/orderService.js
- TEST: 11:21 Europe/Berlin. İstek gövdesindeki skipAccessCheck 403. internal ve req yokken kuru sipariş okunuyor.
- ENTEGRASYON: İstemci atlaması kapalı.
- DURUM: ✅
- EKSİK: Ölçüt karşılandı.

## Madde 98

- GÖREV: Stripe payment adapter
- NE İSTİYOR: Live HTTP requires sales AND LIVE_PAYMENTS
- KOD: `StripeProvider.authorize`.
- TEST: 23 Kasım 2026 10:51 Europe/Berlin. `stripe_disabled` yolu `realMoneyMovement` false. Satış kapalıyken `stripeEnabled` false. Anahtar kullanılmadı.
- ENTEGRASYON: Canlı HTTP yok.
- DURUM: 🟡
- EKSİK: `LIVE_PAYMENTS` adlı ikinci bayrak yok. Canlı tahsilat yok.

## Madde 99

- GÖREV: PayPal payment adapter
- NE İSTİYOR: Same live gate
- KOD: `PayPalProvider.authorize`.
- TEST: 23 Kasım 2026 10:51 Europe/Berlin. `realMoneyMovement` false.
- ENTEGRASYON: Aynı satış kapısı.
- DURUM: 🟡
- EKSİK: Canlı PayPal yok.

## Madde 100

- GÖREV: Dual payment engine
- NE İSTİYOR: Diagnostics use effective flags not raw env
- KOD: `getEffectiveFlags` ve `getProviderHealth`.
- TEST: 23 Kasım 2026 10:51 Europe/Berlin. Ham ödeme ve Stripe bayrağı 1 iken etkin `paymentEnabled` ve `stripeEnabled` false.
- ENTEGRASYON: Teşhis etkin bayrağı okur.
- DURUM: 🟡
- EKSİK: Bütün finans teşhis uçları HTTP ile açılmadı.

## Madde 101

- GÖREV: Finance confirm fail-closed
- NE İSTİYOR: PROVIDER_CONFIRMATION_REQUIRED 409
- KOD: `capturePayment` `PAYMENT_NOT_LIVE` status 403.
- TEST: 23 Kasım 2026 10:51 Europe/Berlin. Kod ve 403 geçti. `realMoneyMovement` false.
- ENTEGRASYON: Sağlayıcı onayı yok.
- DURUM: 🟡
- EKSİK: `PROVIDER_CONFIRMATION_REQUIRED` 409 yok. Mevcut sözleşme 403.

## Madde 102

- GÖREV: Refund fail-closed
- NE İSTİYOR: PROVIDER_REFUND_REQUIRED 409
- KOD: `createRefund` satış kapalıyken `REFUND_NOT_LIVE`.
- TEST: 23 Kasım 2026 10:51 Europe/Berlin. Kod `REFUND_NOT_LIVE`. Veritabanına iade yazılmadı.
- ENTEGRASYON: Canlı iade yok.
- DURUM: 🟡
- EKSİK: `PROVIDER_REFUND_REQUIRED` 409 yok.

## Madde 103

- GÖREV: Returns RMA
- NE İSTİYOR: Customer refund ≠ supplier credit
- KOD: `startReturn`. `customerRefundIssued` ve `supplierRefundReceived` ayrı. `refundMoney` `REAL_REFUND_BLOCKED`.
- TEST: 23 Kasım 2026 10:51 Europe/Berlin. İkisi false. Para hareketi yok.
- ENTEGRASYON: Müşteri iadesi tedarikçi alacağı sayılmıyor.
- DURUM: 🟡
- EKSİK: Gerçek RMA defteri bu turda açılmadı.

## Madde 104

- GÖREV: Financial reconciliation local
- NE İSTİYOR: No invented revenue
- KOD: İade ve yakalama para yazmıyor.
- TEST: 23 Kasım 2026 10:51 Europe/Berlin. `refundIssued` false. Yakalama captured false.
- ENTEGRASYON: Gelir uydurulmuyor.
- DURUM: 🟡
- EKSİK: Ayrı bir mutabakat raporu üretilmedi.

## Madde 105

- GÖREV: Payment idempotency
- NE İSTİYOR: Timeout UNCERTAIN never retried as success
- KOD: `commerce/idempotency.js` farklı yükte `ORDER_IDEMPOTENCY_CONFLICT`, `retryable: false`.
- TEST: `UNCERTAIN` sembolü ödeme idempotency dosyasında yok. Bu turda zaman aşımı satırı yazılmadı.
- ENTEGRASYON: Çatışma başarı sayılmıyor.
- DURUM: 🟡
- EKSİK: `UNCERTAIN` durumu uygulanmamış.

## Madde 106

- GÖREV: Fraud safeguards
- NE İSTİYOR: Client cannot mark paid
- KOD: `detectPriceTampering`. `capturePayment` müşteri gövdesi kabul etmez.
- TEST: 23 Kasım 2026 10:51 Europe/Berlin. Sahte fiyat `price_tampering`. Yakalama 403.
- ENTEGRASYON: Müşteri kendini ödemiş işaretleyemez.
- DURUM: 🟡
- EKSİK: Sahte `paid` alanının HTTP gövdesi ayrıca denenmedi.

## Madde 107

- GÖREV: Financial authorization
- NE İSTİYOR: Finance endpoints not public
- KOD: `paymentsFinancePlugin` onay ve iade `guardAdmin`. Satış kapalıyken iade reddi.
- TEST: 23 Kasım 2026 10:51 Europe/Berlin. `createRefund` kilitli. HTTP finans listesi bu turda açılmadı.
- ENTEGRASYON: Uçlar herkese açık değil.
- DURUM: 🟡
- EKSİK: Tokensuz finans HTTP'si bu turda yeniden ölçülmedi.

## Madde 108

- GÖREV: Live payments gated
- NE İSTİYOR: livePaymentsEnabled false in this workspace
- KOD: `livePaymentsEnabled` sembolü yok. `paymentEnabled` satış olmadan false. `realMoneyMovement` false.
- TEST: 23 Kasım 2026 10:51 Europe/Berlin. İkisi de false.
- ENTEGRASYON: Bu çalışma alanında canlı ödeme kapalı.
- DURUM: 🟡
- EKSİK: Adı geçen `livePaymentsEnabled` alanı yok.

## Madde 109

- GÖREV: Webhook signature verification
- NE İSTİYOR: Unsigned cannot mark paid
- KOD: `finance/paymentWebhook.verify`.
- TEST: 23 Kasım 2026 10:51 Europe/Berlin. İmzasız `MISSING_SIGNATURE`. Yerel HMAC `moneyMoved` false.
- ENTEGRASYON: Sağlayıcı hesabı yok.
- DURUM: 🟡
- EKSİK: Stripe veya PayPal canlı imzası yok.

## Madde 110

- GÖREV: Guest checkout proof
- NE İSTİYOR: 401 without proof
- KOD: Commerce kimlik kapısı madde 16'da. Bu tur satış kilidini yeniden ölçtü.
- TEST: 23 Kasım 2026 10:51 Europe/Berlin. Satış kapalı. Misafir 401 kanıtı `guestCheckoutFailClosed.test.mjs` kaydında.
- ENTEGRASYON: Kanıtsız ödeme yakalanmıyor.
- DURUM: 🟡
- EKSİK: Misafir HTTP'si bu turda yeniden koşulmadı.

## Madde 111

- GÖREV: Order identity / QR
- NE İSTİYOR: Phase 3 identity
- KOD: server/lib/commerce/phase3Identity.js
- TEST: 11:34 Europe/Berlin. itemsFifthPass 3/3. Kuru ödeme adresi QR matrisinden geri okundu. paymentUrl null. verifyPayment PAYMENT_NOT_LIVE. İptal iade etmiyor. Zaman aşımı para hareketi yok.
- ENTEGRASYON: Sağlayıcı hesabı yok. Adres buzzard://dry-pay ve ödeme değil.
- DURUM: ✅
- EKSİK: Ölçüt karşılandı. Canlı ödeme sağlayıcısı bu maddenin dışında.

## Madde 112

- GÖREV: Loyalty non-abuse
- NE İSTİYOR: Cannot mint value via guest IDOR
- KOD: `POST /api/admin/crm-loyalty/points/earn` `requireAnyAdmin`. Müşteri kendi puanını yazamaz. `POST /api/marketing-loyalty/points` izin tablosunda `orders.write`.
- TEST: 24 Kasım 2026 12:30 Europe/Berlin. `localClosedSurface.test.mjs`. Tokensuz `POST /api/marketing-loyalty/points` 401. Gövde müşteri kimliğini geri vermiyor.
- ENTEGRASYON: Kapı `wrapRouteHandler` ve `orders.write`. İzole API. Canlı puan defteri yok.
- DURUM: ✅
- EKSİK: Ölçüt karşılandı.

## Madde 113

- GÖREV: Official payment ingress
- NE İSTİYOR: Single official webhook path
- KOD: `POST /api/webhooks/payment`, `POST /api/webhooks/:provider`, `POST /api/payments-finance/webhook`.
- TEST: 23 Kasım 2026 10:51 Europe/Berlin. Üç kayıt duruyor. İmzasız finans doğrulayıcısı reddediyor.
- ENTEGRASYON: Tek resmi yol değil.
- DURUM: 🟡
- EKSİK: Birden fazla webhook yolu var.

## Madde 114

- GÖREV: Marketplace hub classification
- NE İSTİYOR: Classification only for missing channels
- KOD: `marketplaceConnectorRegistry`. 10 kanal. `decidePublish` `live: false`.
- TEST: 23 Kasım 2026 10:51 Europe/Berlin. `snapshot().anyLive` false.
- ENTEGRASYON: Eksik kanal canlı ilan olmuyor.
- DURUM: 🟡
- EKSİK: Canlı pazar yeri hesabı yok.

## Madde 115

- GÖREV: Listing model without live publish
- NE İSTİYOR: Mutations gated
- KOD: `decidePublish` yayın bayrağı ve kimlik olmadan `LIVE_CONNECTION_BLOCKED` veya doğrulama hatası. `live` false.
- TEST: 23 Kasım 2026 10:51 Europe/Berlin. `live` false.
- ENTEGRASYON: Mutasyon canlıya gitmiyor.
- DURUM: 🟡
- EKSİK: Her kanalın liste yazması HTTP ile denenmedi.

## Madde 116

- GÖREV: Market configuration 35 markets
- NE İSTİYOR: market-engine registry
- KOD: `ab27Tax.AB27` 27 ülke. `taxPools.POOL_COUNTRIES` 26. Ayrı bir 35 pazar motoru yok.
- TEST: 23 Kasım 2026 10:53 Europe/Berlin. `items116to130Markets.test.mjs` 2/2. Uzunluk 27 ve 26.
- ENTEGRASYON: AB vergi anlığı. Canlı vergi dairesi yok.
- DURUM: 🟡
- EKSİK: 35 pazarlık market-engine kaydı yok.

## Madde 117

- GÖREV: VAT configuration
- NE İSTİYOR: Per-market VAT
- KOD: `getStandardVat`. DE 19, GR `EL` 24. ABD null.
- TEST: 23 Kasım 2026 10:53 Europe/Berlin. Üçü geçti. Havuz `paymentAuthority` false.
- ENTEGRASYON: Standart oran anlığı. İndirimli oran yok.
- DURUM: 🟡
- EKSİK: Lisanslı vergi motoru yok.

## Madde 118

- GÖREV: Localization 30 locales
- NE İSTİYOR: lib/i18n
- KOD: `lib/i18n/supported-locales.json`. `server/lib/i18nCatalog.js`.
- TEST: 23 Kasım 2026 10:53 Europe/Berlin. Listede `ar` var. Uzunluk en az 30.
- ENTEGRASYON: Yerel liste. Canlı çeviri servisi yok.
- DURUM: 🟡
- EKSİK: Her vitrin dizesi bu turda çevrilmedi.

## Madde 119

- GÖREV: Multilingual storefront
- NE İSTİYOR: Locale hydration must not rewrite wrongly
- KOD: Pazar hidrasyonu ile dili yeniden yazan bir fonksiyon bulunamadı.
- TEST: 23 Kasım 2026 10:53 Europe/Berlin. `hydrate` araması pazar dilini kapsamıyor.
- ENTEGRASYON: Yeniden yazan bir akış yok.
- DURUM: 🟡
- EKSİK: Hidrasyon fonksiyonu olmadığı için yanlış yazma senaryosu çalıştırılamadı.

## Madde 120

- GÖREV: International expansion registry
- NE İSTİYOR: Markets listed
- KOD: AB27 listesi ve desteklenen diller.
- TEST: 23 Kasım 2026 10:53 Europe/Berlin. 27 ülke ve en az 30 dil.
- ENTEGRASYON: İki ayrı liste.
- DURUM: 🟡
- EKSİK: 35 pazar listesi yok.

## Madde 121

- GÖREV: Marketplace readiness flags
- NE İSTİYOR: Live publish off
- KOD: `marketplaceConnectorRegistry.snapshot`.
- TEST: 23 Kasım 2026 10:53 Europe/Berlin. `anyLive` false. `allBlocked` true.
- ENTEGRASYON: Yayın kapalı.
- DURUM: 🟡
- EKSİK: Canlı mağaza hesabı yok.

## Madde 122

- GÖREV: Amazon/eBay class if present
- NE İSTİYOR: Inventory honesty
- KOD: `carrierAdapters.dryRun`. Etiket `LIVE_SHIPMENT_BLOCKED`.
- TEST: 23 Kasım 2026 10:53 Europe/Berlin. Etiket reddedildi. Fiyat teklifi `live` false.
- ENTEGRASYON: Stok ve gönderi canlı sayılmıyor.
- DURUM: 🟡
- EKSİK: Depo sayımı bu maddede açılmadı.

## Madde 123

- GÖREV: OTTO classification-only
- NE İSTİYOR: No live adapter claimed
- KOD: Taşıyıcı `dryRun` `live: false`.
- TEST: 23 Kasım 2026 10:53 Europe/Berlin. DE teklif canlı değil.
- ENTEGRASYON: Ulusal posta API'si yapılandırılmadı.
- DURUM: 🟡
- EKSİK: Canlı taşıyıcı hesabı yok.

## Madde 124

- GÖREV: eMAG classification-only
- NE İSTİYOR: No live adapter
- KOD: Aynı kuru taşıyıcı kapısı.
- TEST: 23 Kasım 2026 10:53 Europe/Berlin. Etiket oluşturma bloke.
- ENTEGRASYON: Canlı adaptör iddiası yok.
- DURUM: 🟡
- EKSİK: Her ağ ayrı çağrılmadı.

## Madde 125

- GÖREV: Skroutz classification-only
- NE İSTİYOR: No live adapter
- KOD: `NETWORKS` kuru. `live` false.
- TEST: 23 Kasım 2026 10:53 Europe/Berlin. Teklif canlı değil.
- ENTEGRASYON: Canlı adaptör yok.
- DURUM: 🟡
- EKSİK: DHL hesabı yok.

## Madde 126

- GÖREV: bol.com classification-only
- NE İSTİYOR: No live adapter
- KOD: Etiket eylemi `LIVE_SHIPMENT_BLOCKED`.
- TEST: 23 Kasım 2026 10:53 Europe/Berlin. Kod geçti.
- ENTEGRASYON: Canlı adaptör yok.
- DURUM: 🟡
- EKSİK: Etiket sağlayıcısı yok.

## Madde 127

- GÖREV: Cdiscount classification-only
- NE İSTİYOR: No live adapter
- KOD: Dönüş ve iptal akışları kuru çalışma tablosunda.
- TEST: 23 Kasım 2026 10:53 Europe/Berlin. Canlı gönderi kapalı.
- ENTEGRASYON: Canlı adaptör yok.
- DURUM: 🟡
- EKSİK: İade etiketi sağlayıcısı yok.

## Madde 128

- GÖREV: Channel mapping
- NE İSTİYOR: Hub vs software lists
- KOD: Hub kapsamı 50. AB27 27. Dil listesi en az 30.
- TEST: 23 Kasım 2026 10:53 Europe/Berlin. 27 ve dil listesi ölçüldü. Hub 50 madde 58'de.
- ENTEGRASYON: Listeler ayrı.
- DURUM: 🟡
- EKSİK: Üç listenin birebir eşlemesi yok.

## Madde 129

- GÖREV: Marketplace mutations gated
- NE İSTİYOR: No publish without approval
- KOD: `snapshot().allBlocked`. Yayın insan onayı olmadan canlı değil.
- TEST: 23 Kasım 2026 10:53 Europe/Berlin. `allBlocked` true.
- ENTEGRASYON: Onaysız yayın yok.
- DURUM: 🟡
- EKSİK: Onay kuyruğundan ilana giden uç bu turda çağrılmadı.

## Madde 130

- GÖREV: RTL markets
- NE İSTİYOR: RTL CSS
- KOD: `styles/rtl.css` `html[dir="rtl"]`.
- TEST: 23 Kasım 2026 10:53 Europe/Berlin. Seçici dosyada duruyor.
- ENTEGRASYON: Stil sayfası. Tarayıcıda Arapça sayfa açılmadı.
- DURUM: 🟡
- EKSİK: Görsel RTL turu bu oturumda yok.

## Madde 131

- GÖREV: Country and language independence
- NE İSTİYOR: Locale not rewritten on market hydrate
- KOD: lib/market/context.tsx
- TEST: items131to167Storefront 3/3, 10:58 Europe/Berlin. MarketProvider kaynak dosyasında setLocale yok.
- ENTEGRASYON: Ülke seçici dili, dil seçici ülkeyi değiştirmiyor. Depolama anahtarları ayrı.
- DURUM: 🟡
- EKSİK: Her pazar için çalışan bir hydrate testi yok.

## Madde 132

- GÖREV: Market engine registry tests
- NE İSTİYOR: Vitest market checks
- KOD: server/__tests__/items131to167Storefront.test.mjs
- TEST: Aynı dosya 3/3 geçti. Pazar para birimi ve yayın kilidi doğrulandı.
- ENTEGRASYON: Ayrı bir marketEngine paket testi bu turda koşulmadı.
- DURUM: 🟡
- EKSİK: Kayıtlı pazar motoru paketinin tamamı bu dosyada değil.

## Madde 133

- GÖREV: Currency per market
- NE İSTİYOR: Registry currency
- KOD: data/buzzard_europe_countries.json
- TEST: DE currency EUR. Listedeki her satırın üç harfli currency alanı var.
- ENTEGRASYON: Dosya okundu, canlı kur servisi çağrılmadı.
- DURUM: 🟡
- EKSİK: Kur çevirisi ve canlı döviz yok.

## Madde 134

- GÖREV: Legal pages per market
- NE İSTİYOR: Impressum redirects historically
- KOD: app/impressum/page.tsx
- TEST: Sayfa dosyası duruyor. Footer /impressum/ bağlantısı içeriyor.
- ENTEGRASYON: Yönlendirme geçmişi ve her pazarın yasal sayfası tarayıcıda açılmadı.
- DURUM: 🟡
- EKSİK: Pazar başına yasal sayfa kanıtı yok.

## Madde 135

- GÖREV: Feed export dry-run
- NE İSTİYOR: No live marketplace push
- KOD: server/lib/storefront/merchantFeedService.js
- TEST: validateMarketplaceListing publishAllowed false ve live false.
- ENTEGRASYON: Canlı pazaryeri itmesi yapılmadı.
- DURUM: 🟡
- EKSİK: Üretilmiş feed dosyası bu turda yazılmadı.

## Madde 136

- GÖREV: No live listing this session
- NE İSTİYOR: Policy
- KOD: server/lib/marketplace/marketplaceConnectorRegistry.js
- TEST: 11:25 Europe/Berlin. Kayıtlı her bağlayıcının publishDecision sonucu live false ve ok false.
- ENTEGRASYON: Canlı ilan açılmadı.
- DURUM: ✅
- EKSİK: Ölçüt karşılandı.

## Madde 137

- GÖREV: Homepage
- NE İSTİYOR: Storefront home
- KOD: app/page.tsx
- TEST: Ana sayfa dosyası duruyor.
- ENTEGRASYON: Tarayıcıda açılmadı.
- DURUM: 🟡
- EKSİK: Görsel regresyon yok.

## Madde 138

- GÖREV: Navigation / mega menu
- NE İSTİYOR: Desktop mega menu
- KOD: components/MegaMenu.tsx
- TEST: MegaMenu.tsx duruyor. Navbar tüm kategoriler düğmesi mega menüyü açıyor.
- ENTEGRASYON: Masaüstü tıklama kaydı yok.
- DURUM: 🟡
- EKSİK: Açık menünün görsel kanıtı yok.

## Madde 139

- GÖREV: Product pages
- NE İSTİYOR: PDP 200 / unknown 404
- KOD: app/products/[id]/page.tsx
- TEST: Sayfa notFound çağırıyor.
- ENTEGRASYON: 200 ve 404 HTTP yanıtı bu turda alınmadı.
- DURUM: 🟡
- EKSİK: Çalışan vitrin isteği yok.

## Madde 140

- GÖREV: Search UI
- NE İSTİYOR: Storefront search
- KOD: components/MegaMenuSearch.tsx
- TEST: Arama bileşeni duruyor.
- ENTEGRASYON: Arama sonucu HTTP ile doğrulanmadı.
- DURUM: 🟡
- EKSİK: Sorgu sonucu kanıtı yok.

## Madde 141

- GÖREV: Responsive layouts
- NE İSTİYOR: Mobile homepage work
- KOD: styles/pusart.css
- TEST: Ana sayfa ve mobil nav stilleri duruyor.
- ENTEGRASYON: Telefon ve masaüstü görüntüsü alınmadı.
- DURUM: 🟡
- EKSİK: Kırılım genişlikleri ölçülmedi.

## Madde 142

- GÖREV: Customer experience readiness
- NE İSTİYOR: customerExperienceReadiness
- KOD: server/lib/customer/customerExperienceReadiness.js
- TEST: Modül duruyor. Satış kilidi ayrıca false.
- ENTEGRASYON: evaluateCustomerExperienceReadiness bu turda çalıştırılmadı.
- DURUM: 🟡
- EKSİK: Hazırlık kapılarının sonucu yok.

## Madde 143

- GÖREV: Accessibility
- NE İSTİYOR: Not a full WCAG audit this session
- KOD: components/Navbar.tsx
- TEST: Ana navigasyonda role=navigation ve aria-label var.
- ENTEGRASYON: WCAG denetimi yapılmadı.
- DURUM: 🟡
- EKSİK: Tam erişilebilirlik raporu yok.

## Madde 144

- GÖREV: Language selection
- NE İSTİYOR: Locale switcher
- KOD: components/LanguageSelector.tsx
- TEST: setLocale var, setCountryCode yok.
- ENTEGRASYON: Seçicinin tarayıcı davranışı yok.
- DURUM: 🟡
- EKSİK: Dil değişiminin sayfa sonucu yok.

## Madde 145

- GÖREV: Country selection
- NE İSTİYOR: Market switcher
- KOD: components/CountrySelector.tsx
- TEST: setCountryCode var, setLocale yok.
- ENTEGRASYON: Ülke değişiminin sayfa sonucu yok.
- DURUM: 🟡
- EKSİK: Pazar değişimi tarayıcıda yok.

## Madde 146

- GÖREV: RTL CSS
- NE İSTİYOR: Arabic/Hebrew direction
- KOD: styles/rtl.css
- TEST: html[dir=rtl] kuralı duruyor.
- ENTEGRASYON: Arapça veya İbranice sayfa açılmadı.
- DURUM: 🟡
- EKSİK: Yönün görsel kanıtı yok.

## Madde 147

- GÖREV: UI regression Playwright
- NE İSTİYOR: Isolated :3010 static + :3001 API
- KOD: server/__tests__/items131to167Storefront.test.mjs
- TEST: Bu turda Playwright koşulmadı. Vitest 3/3 geçti.
- ENTEGRASYON: 3010 ve 3001 sunucuları açılmadı.
- DURUM: 🟡
- EKSİK: Uçtan uca tarayıcı kaydı yok.

## Madde 148

- GÖREV: Mobile homepage
- NE İSTİYOR: Phone layouts
- KOD: app/page.tsx
- TEST: Ana sayfa dosyası duruyor.
- ENTEGRASYON: Telefon yerleşimi görüntülenmedi.
- DURUM: 🟡
- EKSİK: Cihaz görüntüsü yok.

## Madde 149

- GÖREV: Category boxes and drawers
- NE İSTİYOR: Phone drawers
- KOD: components/Navbar.tsx
- TEST: all-categories-btn duruyor ve mega menüyü açıyor.
- ENTEGRASYON: drawer adlı bir bileşen bulunamadı.
- DURUM: 🟡
- EKSİK: Telefon çekmecesinin ayrı bileşeni yok.

## Madde 150

- GÖREV: Admin UI pages
- NE İSTİYOR: Control Center / PIM / Sessions
- KOD: app/admin/control-center/page.tsx
- TEST: control-center, pim-core ve sessions sayfa dosyaları duruyor.
- ENTEGRASYON: Yönetici oturumu ile açılmadı.
- DURUM: 🟡
- EKSİK: Sayfa içeriği doğrulanmadı.

## Madde 151

- GÖREV: Cart and account chrome
- NE İSTİYOR: Header cart
- KOD: components/Header.tsx
- TEST: Başlık /warenkorb/ bağlantısını içeriyor.
- ENTEGRASYON: Sepet sayımı tarayıcıda yok.
- DURUM: 🟡
- EKSİK: Sepete ekleme akışı yok.

## Madde 152

- GÖREV: Shipping data models
- NE İSTİYOR: shipmentGate
- KOD: server/lib/logistics/carrierContract.js
- TEST: createLabel HUMAN_GATE_REQUIRED, liveShipment false.
- ENTEGRASYON: shipmentGate sembolü yok.
- DURUM: 🟡
- EKSİK: Kapı adı koda bağlı değil.

## Madde 153

- GÖREV: Customer operations
- NE İSTİYOR: customerOrderBridge
- KOD: server/lib/customer/customerOrderBridge.js
- TEST: getOrderHistoryReadiness bridgeEnabled true, realOrdersEnabled false.
- ENTEGRASYON: Müşteri kimliği ile sipariş listesi açılmadı.
- DURUM: 🟡
- EKSİK: Hesaba bağlı sipariş HTTP kanıtı yok.

## Madde 154

- GÖREV: Tracking UI
- NE İSTİYOR: Scan-based stub; not GPS
- KOD: server/lib/logistics/carrierContract.js
- TEST: trackShipment live false. Yanıtta gps yok.
- ENTEGRASYON: Canlı taşıyıcı taraması yok.
- DURUM: 🟡
- EKSİK: Gerçek tarama olayı yok.

## Madde 155

- GÖREV: Notifications draft / send blocked
- NE İSTİYOR: communications.js send BLOCKED
- KOD: server/lib/comms/whatsappSandbox.js
- TEST: send WHATSAPP_SEND_DENIED, sent false.
- ENTEGRASYON: communications.js dosyası yok.
- DURUM: 🟡
- EKSİK: Adı geçen gönderim modülü yok.

## Madde 156

- GÖREV: Customer accounts
- NE İSTİYOR: customerAuth login rate limit
- KOD: server/lib/customerAuth.js
- TEST: customer-login penceresi 15 dakika ve en fazla 8.
- ENTEGRASYON: Hatalı giriş dizisi çalıştırılmadı.
- DURUM: 🟡
- EKSİK: Limitin HTTP  yanıtı yok.

## Madde 157

- GÖREV: Returns workflows
- NE İSTİYOR: RMA + ledger
- KOD: server/lib/logistics/v5/returnsEngine.js
- TEST: startReturn müşteri iadesi ve tedarikçi alacağı false.
- ENTEGRASYON: Defter satırı üretim verisine yazılmadı.
- DURUM: 🟡
- EKSİK: Kapalı bir RMA döngüsü yok.

## Madde 158

- GÖREV: Carrier adapter DHL
- NE İSTİYOR: Stub
- KOD: server/lib/logistics/carrierContract.js
- TEST: DHL createLabel HUMAN_GATE_REQUIRED.
- ENTEGRASYON: Canlı etiket yok.
- DURUM: 🟡
- EKSİK: DHL hesabı yok.

## Madde 159

- GÖREV: Carrier adapter DPD
- NE İSTİYOR: Stub
- KOD: server/lib/logistics/carrierContract.js
- TEST: DPD createLabel HUMAN_GATE_REQUIRED.
- ENTEGRASYON: Canlı etiket yok.
- DURUM: 🟡
- EKSİK: DPD hesabı yok.

## Madde 160

- GÖREV: Carrier adapter GLS
- NE İSTİYOR: Stub
- KOD: server/lib/logistics/carrierContract.js
- TEST: GLS createLabel HUMAN_GATE_REQUIRED.
- ENTEGRASYON: Canlı etiket yok.
- DURUM: 🟡
- EKSİK: GLS hesabı yok.

## Madde 161

- GÖREV: Carrier adapter Hermes
- NE İSTİYOR: Stub
- KOD: server/lib/logistics/carrierContract.js
- TEST: Hermes createLabel HUMAN_GATE_REQUIRED.
- ENTEGRASYON: Canlı etiket yok.
- DURUM: 🟡
- EKSİK: Hermes hesabı yok.

## Madde 162

- GÖREV: Carrier adapter UPS
- NE İSTİYOR: Stub
- KOD: server/lib/logistics/carrierContract.js
- TEST: UPS createLabel HUMAN_GATE_REQUIRED.
- ENTEGRASYON: Canlı etiket yok.
- DURUM: 🟡
- EKSİK: UPS hesabı yok.

## Madde 163

- GÖREV: No real label purchase
- NE İSTİYOR: Policy
- KOD: server/lib/logistics/carrierContract.js
- TEST: snapshot live false, credentialsStored false.
- ENTEGRASYON: Etiket satın alınmadı.
- DURUM: 🟡
- EKSİK: Her taşıyıcı için satın alma reddi ayrı test değil.

## Madde 164

- GÖREV: Operational visibility
- NE İSTİYOR: Control Center events
- KOD: app/admin/control-center/page.tsx
- TEST: Kontrol merkezi sayfası duruyor.
- ENTEGRASYON: Olay listesi çalıştırılmadı.
- DURUM: 🟡
- EKSİK: Sistem olayı kanıtı yok.

## Madde 165

- GÖREV: Communications module
- NE İSTİYOR: Send always BLOCKED
- KOD: server/lib/comms/whatsappSandbox.js
- TEST: Gönderim WHATSAPP_SEND_DENIED.
- ENTEGRASYON: E-posta ve SMS gönderilmedi.
- DURUM: 🟡
- EKSİK: Bütün kanalların tek gönderim kapısı yok.

## Madde 166

- GÖREV: Customer order bridge
- NE İSTİYOR: Existing engine
- KOD: server/lib/customer/customerOrderBridge.js
- TEST: Köprü gerçek siparişi kapalı tutuyor.
- ENTEGRASYON: Mevcut sipariş motoruna yeni yazım yok.
- DURUM: 🟡
- EKSİK: Köprüden ticari sipariş oluşturulmadı ve oluşturulmayacak.

## Madde 167

- GÖREV: Scan-based tracking honesty
- NE İSTİYOR: carriers note not live GPS
- KOD: server/lib/logistics/carrierContract.js
- TEST: IN_TRANSIT izlemesi live false ve gps içermiyor.
- ENTEGRASYON: Taşıyıcı notu ayrıca okunmadı.
- DURUM: 🟡
- EKSİK: Canlı konum iddiası yok, tarama kaynağı da yok.

## Madde 168

- GÖREV: Human Approval Center
- NE İSTİYOR: controlCenter delegates to pusat.approval
- KOD: server/lib/controlCenter.js
- TEST: items168to182Approvals 1/1, 10:59 Europe/Berlin. createApproval PENDING, ardından operator onayı APPROVED.
- ENTEGRASYON: Kontrol merkezi kendi core_approvals tablosuna yazıyor. Ayrı pusat.approval kuyruğuna devretmiyor.
- DURUM: 🟡
- EKSİK: İki onay kaydı duruyor.

## Madde 169

- GÖREV: Exception handling
- NE İSTİYOR: Pusat exceptions
- KOD: server/lib/pusat/runtime.js
- TEST: İzin reddinde exceptionBus emit retryable false. Bu turda o dosyanın testi yeniden koşulmadı.
- ENTEGRASYON: Ödeme yeniden denemesi bu turda yok.
- DURUM: 🟡
- EKSİK: Dönen gövde retryable alanını taşımıyor.

## Madde 170

- GÖREV: Approval policies
- NE İSTİYOR: TTL, risk, requiredApprover
- KOD: server/lib/pusat/durableTaskQueue.js
- TEST: Kuyruk expires_at geçince EXPIRED dönüyor. createApproval riskLevel alıyor.
- ENTEGRASYON: requiredApprover alanı yok.
- DURUM: 🟡
- EKSİK: Politika adı geçen üç alanın hepsi tek kayıtta değil.

## Madde 171

- GÖREV: Approver identity required
- NE İSTİYOR: Empty decidedBy rejected on approve
- KOD: server/lib/controlCenter.js
- TEST: Boş ve boşluk decidedBy null döndü, durum PENDING kaldı. operator@example.test onayı APPROVED.
- ENTEGRASYON: Geçici sqlite. Satış kapalı.
- DURUM: ✅
- EKSİK: Ölçüt karşılandı.

## Madde 172

- GÖREV: Financial-impact recorded
- NE İSTİYOR: financialImpact on metadata
- KOD: server/lib/approvalBinding.js
- TEST: 11:21 Europe/Berlin. financialImpact.realMoneyMovement false ve amount null. İstemci tutarı silindi.
- ENTEGRASYON: Onay metadata sunucuda yazılıyor.
- DURUM: ✅
- EKSİK: Ölçüt karşılandı.

## Madde 173

- GÖREV: Action input hashes
- NE İSTİYOR: hashInput bind
- KOD: server/lib/approvalBinding.js
- TEST: 11:21 Europe/Berlin. hashInput onay alanlarından üretildi. assertBound eşleşti.
- ENTEGRASYON: İstemci hash değeri kabul edilmiyor.
- DURUM: ✅
- EKSİK: Ölçüt karşılandı.

## Madde 174

- GÖREV: Approval expiration
- NE İSTİYOR: expireDue
- KOD: server/lib/pusat/durableTaskQueue.js
- TEST: Süresi geçen onay EXPIRED. expireDue adında fonksiyon yok.
- ENTEGRASYON: Kontrol merkezi satırı süreyle kapanmıyor.
- DURUM: 🟡
- EKSİK: İki onay yolunun süresi ortak değil.

## Madde 175

- GÖREV: Replay protection
- NE İSTİYOR: Second decide duplicate
- KOD: server/lib/controlCenter.js
- TEST: İkinci decideApproval null döndü. İlk APPROVED durumu durdu.
- ENTEGRASYON: HTTP kodu 409 değil, uç 404 gibi boş yanıt alıyor.
- DURUM: 🟡
- EKSİK: Çift karar veri yazmıyor, kod sözleşmesi ayrı.

## Madde 176

- GÖREV: Audit trails
- NE İSTİYOR: controlCenter.recordSystemEvent
- KOD: server/lib/controlCenter.js
- TEST: createApproval ve decideApproval recordSystemEvent çağırıyor.
- ENTEGRASYON: Yazılan olay satırı testte okunmadı.
- DURUM: 🟡
- EKSİK: Denetim satırının içeriği doğrulanmadı.

## Madde 177

- GÖREV: Controlled execution
- NE İSTİYOR: assertBound before execute
- KOD: server/lib/controlCenter.js
- TEST: PENDING olmayan kayıt tekrar yazılmıyor.
- ENTEGRASYON: assertBound adında fonksiyon yok.
- DURUM: 🟡
- EKSİK: Yürütmeden önce hash bağı yok.

## Madde 178

- GÖREV: AI cannot self-approve
- NE İSTİYOR: requestingAgent match rejected
- KOD: server/lib/pusat/humanApproval.js
- TEST: 24 Kasım 2026 12:30 Europe/Berlin. `pricing_ai` düşük riski `WAITING_APPROVAL`. Karar veren ajan `PERMISSION_DENIED` yolunda kalır.
- ENTEGRASYON: İnsan operatörün düşük riskli okuması mevcut politika ile otomatik kalır. Canlı onay ekranı yok.
- DURUM: ✅
- EKSİK: Ölçüt karşılandı.

## Madde 179

- GÖREV: Pending-action list
- NE İSTİYOR: listApprovals PENDING
- KOD: server/lib/controlCenter.js
- TEST: listApprovals PENDING, onaydan sonra bu kaydı döndürmedi.
- ENTEGRASYON: Bütün bekleyen işlerin ekranı açılmadı.
- DURUM: 🟡
- EKSİK: Yönetici arayüzü doğrulanmadı.

## Madde 180

- GÖREV: Revalidate before execute
- NE İSTİYOR: assertBound hash check
- KOD: server/lib/controlCenterJobAdmission.js
- TEST: 11:21 Europe/Berlin. Hash uyuşmazlığında INPUT_HASH_MISMATCH. Kuyruğa iş yazılmadı.
- ENTEGRASYON: Yürütmeden önce bağ kontrolü.
- DURUM: ✅
- EKSİK: Ölçüt karşılandı.

## Madde 181

- GÖREV: Control Center = Pusat approval
- NE İSTİYOR: No unbound insert path
- KOD: server/lib/controlCenter.js
- TEST: createApproval doğrudan PENDING satırı ekliyor.
- ENTEGRASYON: Bağsız ikinci bir insert yolu aranmadı.
- DURUM: 🟡
- EKSİK: Tek yazım yolu kanıtı yok.

## Madde 182

- GÖREV: High-impact gated actions catalog
- NE İSTİYOR: Sales, SoT, live pay, PO, listing, ship, deploy
- KOD: server/core/constants.js
- TEST: RISK düzeyi createApproval içine geçiyor. Satış kapalı kaldı.
- ENTEGRASYON: Satış, SoT, ödeme, sipariş, ilan, gönderi ve deploy kapılarının tek katalog testi yok.
- DURUM: 🟡
- EKSİK: Yüksek etkili eylem listesi bu turda yürütülmedi.

## Madde 183

- GÖREV: Structured logs
- NE İSTİYOR: securityLog + correlation
- KOD: server/lib/securityLog.js
- TEST: logSecurityEvent fonksiyon. server.js X-Request-Id başlığını yazıyor. 11:01 Europe/Berlin.
- ENTEGRASYON: İkisi aynı olayda birlikte okunmadı.
- DURUM: 🟡
- EKSİK: Korelasyon başlığı ile güvenlik olayı eşlenmedi.

## Madde 184

- GÖREV: Metrics
- NE İSTİYOR: Limited local counters
- KOD: server/lib/operations/operationalMetrics.js
- TEST: getOperationalMetrics diagnosticOnly true. Bu turda çalıştırılmadı.
- ENTEGRASYON: Canlı metrik servisi yok.
- DURUM: 🟡
- EKSİK: Sayaçlar okunmadı.

## Madde 185

- GÖREV: Alerting
- NE İSTİYOR: Not a live pager
- KOD: server/lib/security/esatBey.js
- TEST: esatBey.test.mjs 5/5, 11:00 Europe/Berlin. soleDefense false.
- ENTEGRASYON: Canlı çağrı sistemi yok.
- DURUM: 🟡
- EKSİK: Nöbetçi bildirim yok.

## Madde 186

- GÖREV: Backup
- NE İSTİYOR: scripts/backup-db.mjs
- KOD: scripts/backup-db.mjs
- TEST: Betik duruyor. Çalıştırılmadı.
- ENTEGRASYON: Yedek dosyası üretilmedi.
- DURUM: 🟡
- EKSİK: Veritabanı kopyalanmadı.

## Madde 187

- GÖREV: Restore
- NE İSTİYOR: restore-db.mjs --dry-run
- KOD: scripts/restore-db.mjs
- TEST: Geçici dosyada --dry-run çıkış 0. Hedef yazılmadı. 11:00 Europe/Berlin.
- ENTEGRASYON: Üretim geri yüklemesi yok.
- DURUM: ✅
- EKSİK: Ölçüt karşılandı.

## Madde 188

- GÖREV: Persistence design
- NE İSTİYOR: Intended durable disk not /tmp
- KOD: server/lib/dbPaths.js
- TEST: Vitest yolu geçici dizinde. Varsayılan yol server/data/buzzard.db.
- ENTEGRASYON: Kalıcı disk bu makinede bağlı değil.
- DURUM: 🟡
- EKSİK: Tasarlanan disk kanıtı bu başlıkta yok.

## Madde 189

- GÖREV: Recovery
- NE İSTİYOR: Local operations pack
- KOD: scripts/restore-db.mjs
- TEST: Kuruda geri yükleme hedefi yazmadı.
- ENTEGRASYON: Yerel paket üretim kurtarması değil.
- DURUM: 🟡
- EKSİK: Geri dönüş tatbikatı tek dosyayla sınırlı.

## Madde 190

- GÖREV: Incident evidence
- NE İSTİYOR: Reports in docs/software-completion
- KOD: docs/software-completion
- TEST: Rapor dizini duruyor.
- ENTEGRASYON: Güncel bir olay dosyasına bağlanmadı.
- DURUM: 🟡
- EKSİK: Olay kanıtı seçilmedi.

## Madde 191

- GÖREV: Operational diagnostics
- NE İSTİYOR: provider-diagnostics, health
- KOD: server/plugins/productionHealthPlugin.js
- TEST: Sağlık uçları duruyor. provider-diagnostics.mjs yok.
- ENTEGRASYON: Sağlık ucu çağrılmadı.
- DURUM: 🟡
- EKSİK: Sağlayıcı tanılama betiği yok.

## Madde 192

- GÖREV: Correlation IDs
- NE İSTİYOR: X-Request-Id
- KOD: server/server.js
- TEST: Kaynak X-Request-Id başlığını koyuyor.
- ENTEGRASYON: HTTP yanıtı alınmadı.
- DURUM: 🟡
- EKSİK: Başlık telde doğrulanmadı.

## Madde 193

- GÖREV: Security event log
- NE İSTİYOR: logSecurityEvent rate limit + guardian
- KOD: server/lib/securityLog.js
- TEST: Hız sınırı olayları pencerede birleştiriliyor. csrf.test.mjs 4/4 geçti.
- ENTEGRASYON: Birleştirme dalı ayrı koşulmadı.
- DURUM: 🟡
- EKSİK: Guardian olayı bu turda eşlenmedi.

## Madde 194

- GÖREV: Health / software report
- NE İSTİYOR: /api/health/software
- KOD: server/plugins/productionHealthPlugin.js
- TEST: 11:21 Europe/Berlin. GET /api/health/software diagnosticOnly true, salesEnabled false, orchestrator false.
- ENTEGRASYON: Salt okunur rapor.
- DURUM: ✅
- EKSİK: Ölçüt karşılandı.

## Madde 195

- GÖREV: No /tmp as durable app store
- NE İSTİYOR: Policy + dbPaths
- KOD: server/lib/dbPaths.js
- TEST: Test süreci geçici sqlite kullanıyor. Uygulama varsayılanı server/data.
- ENTEGRASYON: Onay merkezinin bazı yolları geçici dizinde.
- DURUM: 🟡
- EKSİK: Bütün yazımlar kalıcı diskte değil.

## Madde 196

- GÖREV: Unit tests
- NE İSTİYOR: vitest run
- KOD: server/__tests__
- TEST: Bu turda vitest dosyaları geçti. Tam paket koşulmadı.
- ENTEGRASYON: Bütün birim testi yok.
- DURUM: 🟡
- EKSİK: Tek komutta tüm paket yok.

## Madde 197

- GÖREV: Integration tests
- NE İSTİYOR: software + commerce
- KOD: server/__tests__/guestCheckoutFailClosed.test.mjs
- TEST: 4/4 geçti. phase7CaptureRoute 1/1 geçti.
- ENTEGRASYON: Yazılım ve ticaret paketinin tamamı değil.
- DURUM: 🟡
- EKSİK: Bütün entegrasyon paketi yok.

## Madde 198

- GÖREV: API security tests
- NE İSTİYOR: fortressAuthz, csrf, cors, guest
- KOD: server/__tests__/csrf.test.mjs
- TEST: CSRF 4/4 ve misafir ticaret 4/4 geçti.
- ENTEGRASYON: fortressAuthz ve CORS bu turda ayrı koşulmadı.
- DURUM: 🟡
- EKSİK: Dört güvenlik dosyasının hepsi yok.

## Madde 199

- GÖREV: E2E tests
- NE İSTİYOR: Playwright
- KOD: playwright.config.ts
- TEST: Yapılandırma duruyor. Playwright koşulmadı.
- ENTEGRASYON: Tarayıcı kaydı yok.
- DURUM: 🟡
- EKSİK: Uçtan uca tur yok.

## Madde 200

- GÖREV: Regression tests
- NE İSTİYOR: Locked manifests on other branches
- KOD: docs/buzzard-237-status-2026-11-23
- TEST: Kilitli manifestolar başka dallarda açılmadı.
- ENTEGRASYON: Karşılaştırma yok.
- DURUM: ⚪
- EKSİK: Diğer dalların kilit dosyası okunmadı.

## Madde 201

- GÖREV: Load-related safe checks
- NE İSTİYOR: Rate limiter unit
- KOD: server/__tests__/rateLimitStore.test.mjs
- TEST: 2/2 geçti, 11:00 Europe/Berlin. Bellek sınırı ve env seçimi.
- ENTEGRASYON: Dağıtık sınır yok.
- DURUM: ✅
- EKSİK: Ölçüt karşılandı.

## Madde 202

- GÖREV: Production build
- NE İSTİYOR: next build isolated
- KOD: package.json
- TEST: next build bu turda çalıştırılmadı.
- ENTEGRASYON: İzole derleme yok.
- DURUM: 🟡
- EKSİK: Derleme kanıtı yok.

## Madde 203

- GÖREV: Lint
- NE İSTİYOR: next lint
- KOD: package.json
- TEST: next lint bu turda çalıştırılmadı.
- ENTEGRASYON: Lint çıktısı yok.
- DURUM: 🟡
- EKSİK: Lint kanıtı yok.

## Madde 204

- GÖREV: Typecheck
- NE İSTİYOR: tsc --noEmit
- KOD: package.json
- TEST: tsc --noEmit bu turda çalıştırılmadı.
- ENTEGRASYON: Tip kontrolü yok.
- DURUM: 🟡
- EKSİK: Tip kanıtı yok.

## Madde 205

- GÖREV: Release quality
- NE İSTİYOR: CI UNKNOWN for PR head vs local
- KOD: PR #515
- TEST: Bu çekme isteğinin kontrolü raporlanmadı.
- ENTEGRASYON: Yerel test CI sonucu değil.
- DURUM: ⚪
- EKSİK: Dalın kontrol kaydı yok.

## Madde 206

- GÖREV: CSRF and CORS tests
- NE İSTİYOR: csrf.test.mjs corsOrigins
- KOD: server/__tests__/csrf.test.mjs
- TEST: CSRF 4/4 geçti.
- ENTEGRASYON: corsOrigins bu turda ayrıca doğrulanmadı.
- DURUM: 🟡
- EKSİK: CORS köken listesi koşulmadı.

## Madde 207

- GÖREV: Finance and idempotency tests
- NE İSTİYOR: fortressAuthz / dualPayment
- KOD: server/__tests__/phase7CaptureRoute.test.mjs
- TEST: Satış kilitliyken yakalama ve iade HTTP reddi 1/1.
- ENTEGRASYON: Çift ödeme matrisi yok.
- DURUM: 🟡
- EKSİK: fortressAuthz dosyası koşulmadı.

## Madde 208

- GÖREV: Human approval tests
- NE İSTİYOR: pusatApprovalExceptions, controlCenter bridge
- KOD: server/__tests__/items168to182Approvals.test.mjs
- TEST: Boş onaycı ve ikinci karar 1/1.
- ENTEGRASYON: pusatApprovalExceptions ayrı koşulmadı.
- DURUM: 🟡
- EKSİK: İstisna paketi yok.

## Madde 209

- GÖREV: Authz and IDOR tests
- NE İSTİYOR: guestCommerceAccess
- KOD: server/__tests__/guestCheckoutFailClosed.test.mjs
- TEST: Kimliksiz sepet ve ödeme 4/4 kapalı.
- ENTEGRASYON: guestCommerceAccess adlı dosya ayrı koşulmadı.
- DURUM: 🟡
- EKSİK: Adı geçen dosya bu turda yok.

## Madde 210

- GÖREV: Dependency audit
- NE İSTİYOR: npm audit --audit-level=high
- KOD: package-lock.json
- TEST: npm audit --audit-level=high çıkış 0. Yüksek ve kritik 0. Orta 8.
- ENTEGRASYON: Orta bulgular kapatılmadı.
- DURUM: 🟡
- EKSİK: Ağaç yüksek eşikte temiz, orta bulgu duruyor.

## Madde 211

- GÖREV: Backup/restore tests
- NE İSTİYOR: test:backup-restore dry-run
- KOD: scripts/restore-db.mjs
- TEST: Geçici dosyada kuru çalıştırma geçti. npm test:backup-restore depo veritabanını kullanacağı için çalıştırılmadı.
- ENTEGRASYON: Paket betiği depo dosyasına bakıyor.
- DURUM: 🟡
- EKSİK: Paket betiği bu turda yok.

## Madde 212

- GÖREV: CI evidence
- NE İSTİYOR: PR #430 checks
- KOD: PR #430
- TEST: quality, e2e-storefront ve e2e-admin SUCCESS. İstek OPEN.
- ENTEGRASYON: Bu dalın kontrolü değil.
- DURUM: 🟡
- EKSİK: Tarihsel kontrol bu başlığa ait değil.

## Madde 213

- GÖREV: Production environment configuration
- NE İSTİYOR: Cannot change production env
- KOD: server/server.js
- TEST: Üretim ortamı bu turda değiştirilmedi.
- ENTEGRASYON: Ortam doğrulama testi ayrı koşulmadı.
- DURUM: 🟡
- EKSİK: Üretim env yazma yasağının testi yok.

## Madde 214

- GÖREV: Deployment preparation
- NE İSTİYOR: Scripts exist; no deploy
- KOD: scripts/production-safety.mjs
- TEST: Betikler duruyor. Dağıtım yapılmadı.
- ENTEGRASYON: Canlı yayın yok.
- DURUM: 🟡
- EKSİK: Dağıtım provası yok.

## Madde 215

- GÖREV: External integrations inventory
- NE İSTİYOR: externalIntegrations.js
- KOD: server/lib/externalIntegrations.js
- TEST: 11:21 Europe/Berlin. inventory live false. Her satır live false.
- ENTEGRASYON: Ağ çağrısı yok.
- DURUM: ✅
- EKSİK: Canlı hesap bağlanmadı.

## Madde 216

- GÖREV: Secrets handling
- NE İSTİYOR: No secrets in git
- KOD: server/lib/jwtSecret.js
- TEST: Bu kayıtlara gizli değer yazılmadı.
- ENTEGRASYON: Tüm geçmiş için gizli tarama yok.
- DURUM: 🟡
- EKSİK: Depo taraması tamamlanmadı.

## Madde 217

- GÖREV: Monitoring
- NE İSTİYOR: Local health only
- KOD: server/plugins/productionHealthPlugin.js
- TEST: Yerel sağlık uçları duruyor.
- ENTEGRASYON: Uç çağrılmadı.
- DURUM: 🟡
- EKSİK: İzleme servisi yok.

## Madde 218

- GÖREV: Commercial readiness
- NE İSTİYOR: Sales off is truthful catalog mode
- KOD: server/lib/salesMode.js
- TEST: isSalesEnabled false. phase7 yakalama reddedildi.
- ENTEGRASYON: productionReady alanı bu testte okunmadı.
- DURUM: 🟡
- EKSİK: Katalog modunun bütün yüzeyleri yok.

## Madde 219

- GÖREV: Launch controls
- NE İSTİYOR: goLiveApproval
- KOD: server/lib/commerce/goLiveApproval.js
- TEST: PRODUCTION_SAFETY_LOCK true. Onay çağrılmadı.
- ENTEGRASYON: Satış açılmadı.
- DURUM: 🟡
- EKSİK: Canlıya alma kararı yok.

## Madde 220

- GÖREV: Render persistence
- NE İSTİYOR: Prior proof branch; this HEAD UNKNOWN
- KOD: server/lib/dbPaths.js
- TEST: Bu başlıkta kalıcı Render diski yok.
- ENTEGRASYON: Önceki dalın kanıtı yeniden okunmadı.
- DURUM: ⚪
- EKSİK: Bu HEAD için disk kanıtı yok.

## Madde 221

- GÖREV: DNS and access policy
- NE İSTİYOR: No live DNS change
- KOD: scripts/production-safety.mjs
- TEST: DNS kaydı bu turda değiştirilmedi.
- ENTEGRASYON: DNS denetim kodu açılmadı.
- DURUM: ⚪
- EKSİK: DNS kontrolü doğrulanmadı.

## Madde 222

- GÖREV: Go-live verify script
- NE İSTİYOR: verify-go-live.mjs
- KOD: scripts/verify-go-live.mjs
- TEST: Betik duruyor. Çalıştırılmadı.
- ENTEGRASYON: Canlı site yoklanmadı.
- DURUM: 🟡
- EKSİK: Doğrulama çıktısı yok.

## Madde 223

- GÖREV: Provider diagnostics
- NE İSTİYOR: provider-diagnostics.mjs
- KOD: scripts/provider-diagnostics.mjs
- TEST: 11:21 Europe/Berlin. Betik çıkış 0. salesEnabled false, network false, live false.
- ENTEGRASYON: Sağlayıcı çağrısı yok.
- DURUM: ✅
- EKSİK: Ölçüt karşılandı.

## Madde 224

- GÖREV: Production safety script
- NE İSTİYOR: production-safety.mjs
- KOD: scripts/production-safety.mjs
- TEST: Betik satışın kapalı kalmasını arıyor. API ayakta olmadığı için çalıştırılmadı.
- ENTEGRASYON: Yerel sunucu açılmadı.
- DURUM: 🟡
- EKSİK: Betiğin kendi çıktısı yok.

## Madde 225

- GÖREV: First real customer order
- NE İSTİYOR: Irreversible
- KOD: server/lib/salesMode.js
- TEST: Satış kapalı. Gerçek müşteri siparişi yazılmadı.
- ENTEGRASYON: Geri alınamaz sipariş bilinçli olarak yok.
- DURUM: 🟡
- EKSİK: İlk gerçek sipariş yok ve açılmayacak.

## Madde 226

- GÖREV: Merge and production deploy
- NE İSTİYOR: Forbidden without human
- KOD: PR #515
- TEST: Bu turda birleştirme yapılmadı.
- ENTEGRASYON: Birleştirme yasağının kod kapısı yok.
- DURUM: 🟡
- EKSİK: İnsan onayı olmadan birleştirme kanıtı yok.

## Madde 227

- GÖREV: Threat detection (safe)
- NE İSTİYOR: Guardian DANGEROUS_PATTERN
- KOD: server/lib/security/esatBey.js
- TEST: esatBey 5/5. Ağ çağrısı yok.
- ENTEGRASYON: Canlı güvenlik merkezi yok.
- DURUM: 🟡
- EKSİK: Tehdit nöbeti yok.

## Madde 228

- GÖREV: Authorization enforcement (Guardian)
- NE İSTİYOR: aiCanExecute
- KOD: server/lib/rbac.js
- TEST: aiCanExecute ai.read ile ai.execute için false, aynı izinle true.
- ENTEGRASYON: Guardian karar yolu ayrı.
- DURUM: 🟡
- EKSİK: Guardian reddi bu fonksiyonda değil.

## Madde 229

- GÖREV: Anomaly detection
- NE İSTİYOR: Rate + dangerous pattern
- KOD: server/lib/security/esatBey.js
- TEST: scanText parola dökümü ipucunda safe false. Hız sınırı ayrı testte geçti.
- ENTEGRASYON: İki kontrol tek anomali motoru değil.
- DURUM: 🟡
- EKSİK: Satın alma ve havale kalıbı bu turda yok.

## Madde 230

- GÖREV: Security telemetry
- NE İSTİYOR: guardian.deny events
- KOD: server/lib/security/esatBey.js
- TEST: Esat olay kaydı tutuyor.
- ENTEGRASYON: guardian.deny adlı olay doğrulanmadı.
- DURUM: 🟡
- EKSİK: Olay adı eşleşmedi.

## Madde 231

- GÖREV: Containment safeguards
- NE İSTİYOR: Deny/fail-closed only; no autonomous destructive containment
- KOD: server/__tests__/phase7CaptureRoute.test.mjs
- TEST: Kilitliyken yakalama reddedildi. Yıkıcı kapatma yok.
- ENTEGRASYON: Otonom yok etme yolu aranmadı.
- DURUM: 🟡
- EKSİK: Bütün kapsama yolları yok.

## Madde 232

- GÖREV: Auditability
- NE İSTİYOR: guardian.allow/deny system events
- KOD: server/lib/controlCenter.js
- TEST: recordSystemEvent onayda çağrılıyor.
- ENTEGRASYON: guardian.allow ve guardian.deny olayları okunmadı.
- DURUM: 🟡
- EKSİK: Guardian denetim adı yok.

## Madde 233

- GÖREV: Agent isolation
- NE İSTİYOR: Tool allow-list + identity required
- KOD: server/lib/rbac.js
- TEST: İzin listesi eşleşmezse false.
- ENTEGRASYON: Kimlik zorunluluğu bu fonksiyonda değil.
- DURUM: 🟡
- EKSİK: Araç kimliği ayrıca yok.

## Madde 234

- GÖREV: Incident response playbooks
- NE İSTİYOR: Docs + deny path
- KOD: server/lib/security/esatBey.js
- TEST: Red yolu testte geçti.
- ENTEGRASYON: Olay rehberi belgesi seçilmedi.
- DURUM: 🟡
- EKSİK: Rehber bağlantısı yok.

## Madde 235

- GÖREV: Secret scanning in Guardian
- NE İSTİYOR: scanSecrets
- KOD: server/lib/security/esatBey.js
- TEST: 24 Kasım 2026 12:30 Europe/Berlin. `scanSecrets("aws_secret_access_key")` `allowed: false`.
- ENTEGRASYON: `scanSecrets`, mevcut `scanText` taramasıdır. Depo taraması ve canlı Guardian yok.
- DURUM: ✅
- EKSİK: Ölçüt karşılandı.

## Madde 236

- GÖREV: Dangerous pattern block
- NE İSTİYOR: purchase/refund/wire/drop table
- KOD: server/lib/security/phase17Evidence.js
- TEST: 24 Kasım 2026 12:30 Europe/Berlin. `drop table`, `wire transfer`, `purchase order` ve `issue refund` `allowed: false` ve `hold: true`.
- ENTEGRASYON: Tarama süreç içi Esat kaydıdır. Canlı satın alma veya iade yok.
- DURUM: ✅
- EKSİK: Ölçüt karşılandı.

## Madde 237

- GÖREV: Guardian evaluation fail-closed
- NE İSTİYOR: evaluate() catches and denies
- KOD: server/lib/security/esatBey.js
- TEST: 24 Kasım 2026 12:30 Europe/Berlin. `evaluate` tarayıcıyı çağırır. Tarayıcı fırlatırsa dönüş `EVALUATE_FAILED`, `allowed: false`.
- ENTEGRASYON: Bu yerel sarmalayıcıdır. Uzak Guardian servisi yapılandırılmadı.
- DURUM: ✅
- EKSİK: Ölçüt karşılandı.

