# 237 madde durum turu — 23 Kasım 2026

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
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `orchestrator`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

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
- TEST: Access-Control-Allow-Origin atanıyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: İzinli origin listesinin reddi bu sabah test edilmedi.

## Madde 10

- GÖREV: Production JWT secret fail-closed
- NE İSTİYOR: Empty/default JWT_SECRET throws in production
- KOD: server/lib/environmentValidation.js
- TEST: Üretimde JWT_SECRET boşsa hata metni var. jwtSecretHardening bu sabah geçti.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Çalışan üretim sürecine bakılmadı.

## Madde 11

- GÖREV: Rate limiting remains enabled
- NE İSTİYOR: Production cannot set RATE_LIMIT_DISABLED; health has own bucket
- KOD: server/__tests__/rateLimitStore.test.mjs
- TEST: Hız sınırı testi bu sabah geçti.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Sağlık yolu için ayrı kova bu turda ölçülmedi.

## Madde 12

- GÖREV: Feature flags sales / SoT / live payments parent-child
- NE İSTİYOR: Child commercial flags ineffective while sales off; SoT never auto-active
- KOD: server/lib/salesMode.js
- TEST: isSalesEnabled satış kapalıyken false. phaseSoftwareSide bu sabah geçti.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Canlı satış açma denemesi yok.

## Madde 13

- GÖREV: Environment validation at startup
- NE İSTİYOR: Production rejects test mode, disabled rate limit, default JWT, live payments without sales
- KOD: server/lib/environmentValidation.js
- TEST: Üretim JWT ve zayıf sır kontrolü var.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Bütün ortam değişkenleri tek tek sayılmadı.

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
- TEST: 23 Kasım 2026 06:19 Europe/Berlin. `part8Foundation.test.mjs` 17/17 geçti. `rejectClientTotals({ total: 1 }).ok` false. Sunucu tarafı toplam hesabı da geçti. HTTP cevabının stack sızdırmadığına dair test yok.
- ENTEGRASYON: `validateCheckout` istemci toplamını reddeder. `sendRequestError` genel API yolunda `publicErrorBody` kullanır. `server/core/errors.js` `publicError` mesaj ve `meta` yayar; `server` içinde çağıran yok.
- DURUM: 🟡
- EKSİK: Toplam reddi birim testi HTTP rotasını çalıştırmıyor. Genel hata gövdesinin iç veri sızdırmadığı test edilmedi.

## Madde 16

- GÖREV: Guest commerce proof for cart/checkout/order
- NE İSTİYOR: Guest without session/token fail-closed
- KOD: `commerceGuards.js` `assertCommerceCredential` ve `authorizeCartWrite`. `cartService.js` yazmadan önce kontrol. `checkoutService.js` ve `orderService.js` kimliksiz HTTP kaydını 401 yapar. `cartCheckoutPlugin.js` eski sepet yolunu da aynı kapıya bağlar.
- TEST: 23 Kasım 2026 07:37 Europe/Berlin. `guestCheckoutFailClosed.test.mjs` 4/4. `part8Foundation.test.mjs` ve `masterIntegrationPhase3.test.mjs` geçti. `adminRouteMatrix.test.mjs` içindeki yazma sınıfları geçti: imzasız sepet ve checkout 401, satış kilitli oturumlar 403. Satış kilidi açık değil.
- ENTEGRASYON: Kimlik, admin oturumu veya imzalı hesap tokenından gelir. Gövdedeki `customerId` token sayılmaz. Motorun süreç içi çağrıları `req` taşımadığında eski kuru akışta kalır.
- DURUM: 🟡
- EKSİK: `POST /api/orders/dry-rehearsal` tokensuz kuru prova çalıştırıyor; bunu bekleyen ayrı test var. `GET /api/orders/:orderNumber` kimliği gizleyerek 200 dönüyor; `adminAuthorizationHardening.test.mjs` bunu sözleşme sayıyor. Bu iki vitrin yolu değiştirilmedi.

## Madde 17

- GÖREV: Diagnostic / Guardian / Orchestrator / DB GET protection
- NE İSTİYOR: Unauthenticated diagnostic prefixes 401
- KOD: `guardianBridgePlugin.js` ve `orchestratorBridgePlugin.js` admin oturumu ister. `databasePlugin.js` `/api/db/status` hesap tokenı ister. Bu üçü `PUBLIC_ROUTES` dışına alındı.
- TEST: 23 Kasım 2026 07:39 Europe/Berlin. `diagnosticGetAuth.test.mjs` 3/3. Tokensuz Guardian, Orchestrator ve DB status 401. Admin oturumu Guardian ve Orchestrator status için 200, ikisi de `configured: false`. Hesap tokenı DB status için 200. `/api/health` tokensuz 200 kaldı.
- ENTEGRASYON: Admin oturumu DB status kapısından geçmez. Hesap tokenı Guardian status kapısından geçmez. Guardian ve Orchestrator adresi bu ortamda yok.
- DURUM: 🟡
- EKSİK: `/api/health` ve altındaki hazırlık uçları hâlâ herkese açık. Canlılık yoklaması bilinçli olarak kapatılmadı.

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
- TEST: Aynı dosya. Cevap yalnız `{ success:false, errorKey }`. `stack` yok.
- ENTEGRASYON: `server.js` `sendRequestError` bu gövdeyi kullanır.
- DURUM: 🟡
- EKSİK: `core/errors.js` mesaj yaymaya devam ediyor.

## Madde 22

- GÖREV: Cart data contract
- NE İSTİYOR: Server-owned totals; session binding
- KOD: `server/lib/commerce/commerceValidation.js` `rejectClientTotals` ve `validateQuantity`.
- TEST: Aynı dosya. Negatif adet ve istemci toplamı reddedildi.
- ENTEGRASYON: Sepet HTTP kapısı madde 16’da token ister.
- DURUM: 🟡
- EKSİK: Madde 16’daki iki vitrin sözleşmesi duruyor.

## Madde 23

- GÖREV: Checkout data contract
- NE İSTİYOR: Sales lock; guest proof
- KOD: `server/lib/commerce/commerceGuards.js` `catalogMode`.
- TEST: Aynı dosya. Satış kapalıyken katalog modu true.
- ENTEGRASYON: Ticari checkout 403 `sales_disabled` madde 16 testinde duruyor.
- DURUM: 🟡
- EKSİK: Misafir kuru prova hâlâ tokensuz çalışıyor.

## Madde 24

- GÖREV: Order data contract
- NE İSTİYOR: Guest token stripped from public map
- KOD: `server/lib/commerce/orderService.js` `mapOrder`. `commerce_orders` şemasında token kolonu yok.
- TEST: Fonksiyon bu turda okundu. Ayrı birim çağrısı yok. Ayrıntı `06_MADDE_18_34.md`.
- ENTEGRASYON: HTTP sipariş okuması madde 16’da kimlik ister.
- DURUM: 🟡
- EKSİK: `mapOrder` için ayrı bir çağrı testi yok.

## Madde 25

- GÖREV: Product data contract
- NE İSTİYOR: Canonical product fields via PIM core
- KOD: `server/lib/pimCatalog.js` ve `server/lib/productCatalogPim.js` `canonicalProductId`.
- TEST: Dosyalar bu turda açıldı. Uçtan uca ürün oluşturma koşulmadı.
- ENTEGRASYON: Sipariş satırı `canonicalProductId` alanını ürün kimliğinden dolduruyor.
- DURUM: 🟡
- EKSİK: Yeni bir PIM yazma testi bu turda yok.

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
- KOD: `server/lib/commerce/commerceValidation.js`.
- TEST: Aynı dosya. `validateQuantity(-1)` ve `0` başarısız. İstemci toplamı reddedildi.
- ENTEGRASYON: Sepet kalemi bu doğrulamadan geçmeden yazılmıyor.
- DURUM: 🟡
- EKSİK: İade motorundaki miktar kuralı ayrıca çağrılmadı.

## Madde 28

- GÖREV: Idempotency-key plumbing
- NE İSTİYOR: Sensitive commerce operations accept Idempotency-Key
- KOD: `commerce_idempotency` tablosu. `commerceCorePlugin.js` `Idempotency-Key` başlığı.
- TEST: Kod bu turda okundu. Yeni tekrar oynatma çağrısı yok.
- ENTEGRASYON: Checkout tamamlama aynı anahtarla `withIdempotency` kullanır.
- DURUM: 🟡
- EKSİK: Bu turda yeni bir replay çağrısı yok.

## Madde 29

- GÖREV: Request correlation IDs
- NE İSTİYOR: X-Request-Id / X-Correlation-Id on API
- KOD: `server/server.js` `handleRequest`. `server/lib/operations/correlationContext.js`.
- TEST: Aynı dosya. `GET /api/health` 200. `X-Request-Id` dolu. Gönderilen `X-Correlation-Id` geri döndü.
- ENTEGRASYON: Başlıklar bütün `/api` isteklerinin ortak girişinde yazılıyor.
- DURUM: 🟡
- EKSİK: Bozuk kimlik başlığının reddi bu çağrıda yok.

## Madde 30

- GÖREV: Software facade is not a second orchestrator
- NE İSTİYOR: server/lib/software wraps existing engines
- KOD: `server/lib/software` bu dalda yok.
- TEST: Dizin arandı, dosya yok. `controlCenter.js` bu maddeyi karşılamıyor.
- ENTEGRASYON: Cephe olmadığı için motorlara ikinci bir sarmalayıcı bağlanmadı.
- DURUM: 🔴
- EKSİK: Yazılım cephesi uygulanmadı.

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
- TEST: 23 Kasım 2026 08:15 Europe/Berlin. `PUSAT_RUNTIME_ENABLED=1` iken dönüş `PERMISSION_DENIED`. Sağlık `deniedWrites` içinde `CAPTURE_PAYMENT`. Satış kilidi açılmadı.
- ENTEGRASYON: `exceptionBus` yayını. Canlı ödeme yok.
- DURUM: 🟡
- EKSİK: Dönüş gövdesi `retryable` alanını taşımıyor. Diğer istisna sınıfları bu testte sayılmadı.

## Madde 41

- GÖREV: AI governance: cannot self-approve
- NE İSTİYOR: decide() rejects requesting agent / AI identity
- KOD: `durableTaskQueue.decideApproval` yalnız `human` ve `operator`. `controlCenter.decideApproval` aktörü denetlemez. `humanApproval.submit` düşük riski `policy:low-risk` ile otomatik APPROVED yapar.
- TEST: 23 Kasım 2026 08:15 Europe/Berlin. `pricing_ai` kararı `PERMISSION_DENIED`. `human` geçer. Düşük risk `auto: true`. Yüksek risk `WAITING_APPROVAL`.
- ENTEGRASYON: İki karar yolu var. Kuyruk yolu ajanı reddeder.
- DURUM: 🟡
- EKSİK: Düşük risk insan kararı olmadan onaylanır. `controlCenter.decideApproval` isteyen ajanı reddetmez.

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
- KOD: `server/lib` ve `server/lib/buzzardNative` içinde ajan penceresi arandı. Eşleşme yok.
- TEST: Koşulacak bir pencere yok.
- ENTEGRASYON: Guardian rate hesabı bağlı değil.
- DURUM: 🔴
- EKSİK: Ajan başına Guardian hız penceresi uygulanmamış.

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
- KOD: Depoda `authorizeCreate`, `authorizeUpdate`, `authorizeDelete` yok.
- TEST: 23 Kasım 2026 08:18 Europe/Berlin. Sembol arandı. Eşleşme yok.
- ENTEGRASYON: Oturumdan aktör alan bir ürün yazma kapısı yok.
- DURUM: 🔴
- EKSİK: Üç yetki fonksiyonu uygulanmamış.

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
- KOD: `assertNoDualWrite` depoda yok.
- TEST: 23 Kasım 2026 08:18 Europe/Berlin. Sembol arandı. Eşleşme yok.
- ENTEGRASYON: Çift yazmayı atan bir fonksiyon yok.
- DURUM: 🔴
- EKSİK: Fonksiyon uygulanmamış.

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
- KOD: `BUZZARD_PRODUCT_STORE_PATH` sunucuda yok. Veritabanı yolu `BUZZARD_DB_PATH`.
- TEST: 23 Kasım 2026 08:18 Europe/Berlin. Ürün, testin verdiği `BUZZARD_DB_PATH` dosyasına yazıldı.
- ENTEGRASYON: İstenen ortam adı uygulanmamış.
- DURUM: 🔴
- EKSİK: `BUZZARD_PRODUCT_STORE_PATH` yok.

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
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `searchAndSort`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 70

- GÖREV: Product i18n
- NE İSTİYOR: fill-product-i18n-gaps
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `locale`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 71

- GÖREV: Customs validation on products
- NE İSTİYOR: validateCustomsDecision
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `customs`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 72

- GÖREV: Catalog / PIM health
- NE İSTİYOR: pimCatalog plugin health
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `catalog`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 73

- GÖREV: SoT activation remains human-gated
- NE İSTİYOR: humanApprovalRequired true
- KOD: server/lib/salesSafetyGate.js
- TEST: PRODUCT_SOT kapısı var.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Kaynak etkinleştirme insan işi.

## Madde 74

- GÖREV: No invented live prices or images
- NE İSTİYOR: Catalog mode; no fake LIVE_VERIFIED prices
- KOD: server/lib/buzzardNative/core/specialists/pricingEngine.js
- TEST: Bu ağaçta `MISSING_COST` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

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
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `reserve`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 86

- GÖREV: WMS reserve vs software reserve
- NE İSTİYOR: Two tables; shared audit only
- KOD: server/plugins/wmsInventoryPlugin.js
- TEST: Bu ağaçta `wmsInventory` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

## Madde 87

- GÖREV: Inter-Cars adapter class
- NE İSTİYOR: Sandbox/mock; no live order
- KOD: yok
- TEST: server ağacında Inter Cars adaptörü yok.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🔴
- EKSİK: Adaptör yazılmamış. Canlı hesap olsa da bağlanacak sınıf yok.

## Madde 88

- GÖREV: TecDoc adapter class
- NE İSTİYOR: Classification / adapter
- KOD: server/lib/adapters/tecdocAdapter.js
- TEST: TecDoc kum havuzu adaptörü var.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⛔
- EKSİK: Canlı TecDoc hesabı ve kataloğu bu ağaçta yok.

## Madde 89

- GÖREV: Price snapshot on cart
- NE İSTİYOR: priceSnapshot field
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `price snapshot`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 90

- GÖREV: Currency handling
- NE İSTİYOR: Market currency
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `currency`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 91

- GÖREV: Market price rules
- NE İSTİYOR: Per-market config
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `quoteForMarket`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 92

- GÖREV: Supplier connector inventory honesty
- NE İSTİYOR: class NOT_IMPLEMENTED where true
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `supplier`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 93

- GÖREV: Supplier retry/idempotency
- NE İSTİYOR: Fail-closed outage
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `supplier`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 94

- GÖREV: Fail-closed supplier outage
- NE İSTİYOR: Malformed/outage not treated as stock
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `outage`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 95

- GÖREV: Cart service
- NE İSTİYOR: Session-bound writes
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `cart`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 96

- GÖREV: Checkout service
- NE İSTİYOR: Sales lock + guest proof
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `checkout`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 97

- GÖREV: Order service
- NE İSTİYOR: skipAccessCheck only internal
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `orderManagement`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 98

- GÖREV: Stripe payment adapter
- NE İSTİYOR: Live HTTP requires sales AND LIVE_PAYMENTS
- KOD: server/lib/paymentsFinance.js
- TEST: Stripe adı finans kodunda var.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Canlı tahsilat yok.

## Madde 99

- GÖREV: PayPal payment adapter
- NE İSTİYOR: Same live gate
- KOD: server/lib/paymentsFinance.js
- TEST: PayPal adı finans kodunda var.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Canlı tahsilat yok.

## Madde 100

- GÖREV: Dual payment engine
- NE İSTİYOR: Diagnostics use effective flags not raw env
- KOD: server/lib/paymentsFinance.js
- TEST: Ödeme fonksiyonları bu dosyada. phase7CaptureRoute bu sabah geçti: satış kapalıyken yakalama ve iade 403.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Canlı para hareketi yok.

## Madde 101

- GÖREV: Finance confirm fail-closed
- NE İSTİYOR: PROVIDER_CONFIRMATION_REQUIRED 409
- KOD: server/lib/paymentsFinance.js
- TEST: Satış kilitliyken finans yazısı reddediliyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Canlı onay yok.

## Madde 102

- GÖREV: Refund fail-closed
- NE İSTİYOR: PROVIDER_REFUND_REQUIRED 409
- KOD: server/lib/paymentsFinance.js
- TEST: REFUND_NOT_LIVE. phase7 bu sabah 403 gördü.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Canlı iade yok.

## Madde 103

- GÖREV: Returns RMA
- NE İSTİYOR: Customer refund ≠ supplier credit
- KOD: server/lib/platform/devList51.js
- TEST: Bu ağaçta `startReturn` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

## Madde 104

- GÖREV: Financial reconciliation local
- NE İSTİYOR: No invented revenue
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `reconciliation`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 105

- GÖREV: Payment idempotency
- NE İSTİYOR: Timeout UNCERTAIN never retried as success
- KOD: server/lib/paymentsFinance.js
- TEST: Bu ağaçta `idempotency` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

## Madde 106

- GÖREV: Fraud safeguards
- NE İSTİYOR: Client cannot mark paid
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `fraud`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 107

- GÖREV: Financial authorization
- NE İSTİYOR: Finance endpoints not public
- KOD: server/lib/paymentsFinance.js
- TEST: Bu ağaçta `refuseWhileSalesLocked` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

## Madde 108

- GÖREV: Live payments gated
- NE İSTİYOR: livePaymentsEnabled false in this workspace
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `BUZZARD_LIVE_PAYMENTS`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 109

- GÖREV: Webhook signature verification
- NE İSTİYOR: Unsigned cannot mark paid
- KOD: server/__tests__/webhookSecurity.test.mjs
- TEST: Webhook güvenlik testi bu sabah geçti.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: İmza sağlayıcı hesabı yok.

## Madde 110

- GÖREV: Guest checkout proof
- NE İSTİYOR: 401 without proof
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `guest`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 111

- GÖREV: Order identity / QR
- NE İSTİYOR: Phase 3 identity
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `QR`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 112

- GÖREV: Loyalty non-abuse
- NE İSTİYOR: Cannot mint value via guest IDOR
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `loyalty`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 113

- GÖREV: Official payment ingress
- NE İSTİYOR: Single official webhook path
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `payment ingress`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 114

- GÖREV: Marketplace hub classification
- NE İSTİYOR: Classification only for missing channels
- KOD: server/lib/marketplace/marketplaceConnectorRegistry.js
- TEST: 10 kanal tanımlı. marketplaceConnectorRegistry testi bu sabah geçti.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Canlı ilan yok.

## Madde 115

- GÖREV: Listing model without live publish
- NE İSTİYOR: Mutations gated
- KOD: server/lib/marketplaceHub.js
- TEST: Bu ağaçta `validateMarketplaceListing` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

## Madde 116

- GÖREV: Market configuration 35 markets
- NE İSTİYOR: market-engine registry
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `market`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 117

- GÖREV: VAT configuration
- NE İSTİYOR: Per-market VAT
- KOD: server/lib/buzzardNative/core/tradeFlow.js
- TEST: Bu ağaçta `vatEngine` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

## Madde 118

- GÖREV: Localization 30 locales
- NE İSTİYOR: lib/i18n
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `supported-locales`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 119

- GÖREV: Multilingual storefront
- NE İSTİYOR: Locale hydration must not rewrite wrongly
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `locale`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 120

- GÖREV: International expansion registry
- NE İSTİYOR: Markets listed
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `europe`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 121

- GÖREV: Marketplace readiness flags
- NE İSTİYOR: Live publish off
- KOD: server/lib/marketplace/marketplaceConnectorRegistry.js
- TEST: Bu ağaçta `LIVE_CONNECTION_BLOCKED` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

## Madde 122

- GÖREV: Amazon/eBay class if present
- NE İSTİYOR: Inventory honesty
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `amazon`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 123

- GÖREV: OTTO classification-only
- NE İSTİYOR: No live adapter claimed
- KOD: server/lib/marketplace/marketplaceConnectorRegistry.js
- TEST: otto kanalı listede.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Canlı OTTO adaptörü yok.

## Madde 124

- GÖREV: eMAG classification-only
- NE İSTİYOR: No live adapter
- KOD: server/lib/marketplace/marketplaceConnectorRegistry.js
- TEST: emag kanalı listede.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Canlı eMAG yok.

## Madde 125

- GÖREV: Skroutz classification-only
- NE İSTİYOR: No live adapter
- KOD: server/lib/marketplace/marketplaceConnectorRegistry.js
- TEST: skroutz kanalı listede.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Canlı Skroutz yok.

## Madde 126

- GÖREV: bol.com classification-only
- NE İSTİYOR: No live adapter
- KOD: server/lib/marketplace/marketplaceConnectorRegistry.js
- TEST: bol kanalı listede.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Canlı bol.com yok.

## Madde 127

- GÖREV: Cdiscount classification-only
- NE İSTİYOR: No live adapter
- KOD: server/lib/marketplace/marketplaceConnectorRegistry.js
- TEST: cdiscount kanalı listede.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Canlı Cdiscount yok.

## Madde 128

- GÖREV: Channel mapping
- NE İSTİYOR: Hub vs software lists
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `channel`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 129

- GÖREV: Marketplace mutations gated
- NE İSTİYOR: No publish without approval
- KOD: server/lib/marketplace/marketplaceConnectorRegistry.js
- TEST: decidePublish LIVE_CONNECTION_BLOCKED döner.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Canlı yayın insan ve kimlik bilgisi ister.

## Madde 130

- GÖREV: RTL markets
- NE İSTİYOR: RTL CSS
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `rtl`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 131

- GÖREV: Country and language independence
- NE İSTİYOR: Locale not rewritten on market hydrate
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `languageIndependence`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 132

- GÖREV: Market engine registry tests
- NE İSTİYOR: Vitest market checks
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `marketEngine`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 133

- GÖREV: Currency per market
- NE İSTİYOR: Registry currency
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `currency`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 134

- GÖREV: Legal pages per market
- NE İSTİYOR: Impressum redirects historically
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `impressum`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 135

- GÖREV: Feed export dry-run
- NE İSTİYOR: No live marketplace push
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `feed`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 136

- GÖREV: No live listing this session
- NE İSTİYOR: Policy
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `PUBLISH_BLOCKED`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 137

- GÖREV: Homepage
- NE İSTİYOR: Storefront home
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `homepage`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 138

- GÖREV: Navigation / mega menu
- NE İSTİYOR: Desktop mega menu
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `mega`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 139

- GÖREV: Product pages
- NE İSTİYOR: PDP 200 / unknown 404
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `product page`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 140

- GÖREV: Search UI
- NE İSTİYOR: Storefront search
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `search`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 141

- GÖREV: Responsive layouts
- NE İSTİYOR: Mobile homepage work
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `responsive`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 142

- GÖREV: Customer experience readiness
- NE İSTİYOR: customerExperienceReadiness
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `customer experience`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 143

- GÖREV: Accessibility
- NE İSTİYOR: Not a full WCAG audit this session
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `accessibility`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 144

- GÖREV: Language selection
- NE İSTİYOR: Locale switcher
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `locale`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 145

- GÖREV: Country selection
- NE İSTİYOR: Market switcher
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `country`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 146

- GÖREV: RTL CSS
- NE İSTİYOR: Arabic/Hebrew direction
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `rtl`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 147

- GÖREV: UI regression Playwright
- NE İSTİYOR: Isolated :3010 static + :3001 API
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `playwright`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 148

- GÖREV: Mobile homepage
- NE İSTİYOR: Phone layouts
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `mobile`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 149

- GÖREV: Category boxes and drawers
- NE İSTİYOR: Phone drawers
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `drawer`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 150

- GÖREV: Admin UI pages
- NE İSTİYOR: Control Center / PIM / Sessions
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `admin`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 151

- GÖREV: Cart and account chrome
- NE İSTİYOR: Header cart
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `cart`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 152

- GÖREV: Shipping data models
- NE İSTİYOR: shipmentGate
- KOD: server/lib/workstreams/special16Runtime.js
- TEST: Bu ağaçta `carrierAdapter` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

## Madde 153

- GÖREV: Customer operations
- NE İSTİYOR: customerOrderBridge
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `customer`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 154

- GÖREV: Tracking UI
- NE İSTİYOR: Scan-based stub; not GPS
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `tracking`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 155

- GÖREV: Notifications draft / send blocked
- NE İSTİYOR: communications.js send BLOCKED
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `notification`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 156

- GÖREV: Customer accounts
- NE İSTİYOR: customerAuth login rate limit
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `account`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 157

- GÖREV: Returns workflows
- NE İSTİYOR: RMA + ledger
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `returns`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 158

- GÖREV: Carrier adapter DHL
- NE İSTİYOR: Stub
- KOD: server/lib/logistics/carrierAdapter.js
- TEST: DHL createShipment/createLabel var.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Canlı etiket yok.

## Madde 159

- GÖREV: Carrier adapter DPD
- NE İSTİYOR: Stub
- KOD: server/lib/logistics/v5/adapterFramework.js
- TEST: DPD kaydı var.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Canlı etiket yok.

## Madde 160

- GÖREV: Carrier adapter GLS
- NE İSTİYOR: Stub
- KOD: server/lib/logistics/v5/adapterFramework.js
- TEST: GLS kaydı var.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Canlı etiket yok.

## Madde 161

- GÖREV: Carrier adapter Hermes
- NE İSTİYOR: Stub
- KOD: server/lib/logistics/v5/adapterFramework.js
- TEST: Hermes kaydı var.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Canlı etiket yok.

## Madde 162

- GÖREV: Carrier adapter UPS
- NE İSTİYOR: Stub
- KOD: server/lib/logistics/v5/adapterFramework.js
- TEST: UPS kaydı var.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Canlı etiket yok.

## Madde 163

- GÖREV: No real label purchase
- NE İSTİYOR: Policy
- KOD: server/lib/logistics/carrierContract.js
- TEST: Bu ağaçta `createLabel` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

## Madde 164

- GÖREV: Operational visibility
- NE İSTİYOR: Control Center events
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `operational`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 165

- GÖREV: Communications module
- NE İSTİYOR: Send always BLOCKED
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `notification`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 166

- GÖREV: Customer order bridge
- NE İSTİYOR: Existing engine
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `order bridge`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 167

- GÖREV: Scan-based tracking honesty
- NE İSTİYOR: carriers note not live GPS
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `IN_TRANSIT`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 168

- GÖREV: Human Approval Center
- NE İSTİYOR: controlCenter delegates to pusat.approval
- KOD: server/lib/pusat/humanApproval.js
- TEST: Onay merkezi var. Düşük risk otomatik APPROVED. Varsayılan veritabanı os.tmpdir.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Kendini onaylama yasağı bu dosyada görünmüyor. Kalıcı disk değil.

## Madde 169

- GÖREV: Exception handling
- NE İSTİYOR: Pusat exceptions
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `exception`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 170

- GÖREV: Approval policies
- NE İSTİYOR: TTL, risk, requiredApprover
- KOD: server/core/constants.js
- TEST: Bu ağaçta `WAITING_APPROVAL` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

## Madde 171

- GÖREV: Approver identity required
- NE İSTİYOR: Empty decidedBy rejected on approve
- KOD: server/lib/controlCenter.js
- TEST: Bu ağaçta `actorId` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

## Madde 172

- GÖREV: Financial-impact recorded
- NE İSTİYOR: financialImpact on metadata
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `financial`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 173

- GÖREV: Action input hashes
- NE İSTİYOR: hashInput bind
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `input hash`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 174

- GÖREV: Approval expiration
- NE İSTİYOR: expireDue
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `expire`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 175

- GÖREV: Replay protection
- NE İSTİYOR: Second decide duplicate
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `replay`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 176

- GÖREV: Audit trails
- NE İSTİYOR: controlCenter.recordSystemEvent
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `audit-log`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 177

- GÖREV: Controlled execution
- NE İSTİYOR: assertBound before execute
- KOD: server/lib/controlCenter.js
- TEST: Bu ağaçta `decideApproval` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

## Madde 178

- GÖREV: AI cannot self-approve
- NE İSTİYOR: requestingAgent match rejected
- KOD: server/lib/pusat/humanApproval.js
- TEST: auto: true bulundu. Bu, yasağın geçtiğini göstermez.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Onay merkezi düşük riski otomatik onaylıyor.

## Madde 179

- GÖREV: Pending-action list
- NE İSTİYOR: listApprovals PENDING
- KOD: server/lib/controlCenter.js
- TEST: Bu ağaçta `listApprovals` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

## Madde 180

- GÖREV: Revalidate before execute
- NE İSTİYOR: assertBound hash check
- KOD: server/lib/controlCenter.js
- TEST: Bu ağaçta `decideApproval` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

## Madde 181

- GÖREV: Control Center = Pusat approval
- NE İSTİYOR: No unbound insert path
- KOD: server/core/auth/providers/aiProvider.js
- TEST: Bu ağaçta `controlCenter` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

## Madde 182

- GÖREV: High-impact gated actions catalog
- NE İSTİYOR: Sales, SoT, live pay, PO, listing, ship, deploy
- KOD: server/core/constants.js
- TEST: Bu ağaçta `RISK` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

## Madde 183

- GÖREV: Structured logs
- NE İSTİYOR: securityLog + correlation
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `security log`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 184

- GÖREV: Metrics
- NE İSTİYOR: Limited local counters
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `metrics`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 185

- GÖREV: Alerting
- NE İSTİYOR: Not a live pager
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `alert`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 186

- GÖREV: Backup
- NE İSTİYOR: scripts/backup-db.mjs
- KOD: server/lib/backupAutomation.js
- TEST: Yedek otomasyonu dosyası var.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Bu sabah yedekten geri dönüş koşulmadı.

## Madde 187

- GÖREV: Restore
- NE İSTİYOR: restore-db.mjs --dry-run
- KOD: server/lib/operations/restoreSafety.js
- TEST: Geri yükleme güvenlik dosyası var.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Üretim geri yüklemesi yok.

## Madde 188

- GÖREV: Persistence design
- NE İSTİYOR: Intended durable disk not /tmp
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `persistent`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 189

- GÖREV: Recovery
- NE İSTİYOR: Local operations pack
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `recovery`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 190

- GÖREV: Incident evidence
- NE İSTİYOR: Reports in docs/software-completion
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `incident`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 191

- GÖREV: Operational diagnostics
- NE İSTİYOR: provider-diagnostics, health
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `diagnostics`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 192

- GÖREV: Correlation IDs
- NE İSTİYOR: X-Request-Id
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `correlation`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 193

- GÖREV: Security event log
- NE İSTİYOR: logSecurityEvent rate limit + guardian
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `security]`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 194

- GÖREV: Health / software report
- NE İSTİYOR: /api/health/software
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `/api/health`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 195

- GÖREV: No /tmp as durable app store
- NE İSTİYOR: Policy + dbPaths
- KOD: server/lib/dataDir.js
- TEST: tmpdir kullanımı bulundu. Yasağın testi bu sabah yok.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Onay merkezinin varsayılan veritabanı os.tmpdir.

## Madde 196

- GÖREV: Unit tests
- NE İSTİYOR: vitest run
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `vitest`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 197

- GÖREV: Integration tests
- NE İSTİYOR: software + commerce
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `integration`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 198

- GÖREV: API security tests
- NE İSTİYOR: fortressAuthz, csrf, cors, guest
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `csrf.test`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 199

- GÖREV: E2E tests
- NE İSTİYOR: Playwright
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `e2e`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 200

- GÖREV: Regression tests
- NE İSTİYOR: Locked manifests on other branches
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `regression`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 201

- GÖREV: Load-related safe checks
- NE İSTİYOR: Rate limiter unit
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `rateLimit`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 202

- GÖREV: Production build
- NE İSTİYOR: next build isolated
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `next build`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 203

- GÖREV: Lint
- NE İSTİYOR: next lint
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `next lint`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 204

- GÖREV: Typecheck
- NE İSTİYOR: tsc --noEmit
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `tsc`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 205

- GÖREV: Release quality
- NE İSTİYOR: CI UNKNOWN for PR head vs local
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `release`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 206

- GÖREV: CSRF and CORS tests
- NE İSTİYOR: csrf.test.mjs corsOrigins
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `csrf.test`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 207

- GÖREV: Finance and idempotency tests
- NE İSTİYOR: fortressAuthz / dualPayment
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `phase7CaptureRoute`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 208

- GÖREV: Human approval tests
- NE İSTİYOR: pusatApprovalExceptions, controlCenter bridge
- KOD: server/core/part32FinalControlRecoveryConstants.js
- TEST: Bu ağaçta `humanApproval` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

## Madde 209

- GÖREV: Authz and IDOR tests
- NE İSTİYOR: guestCommerceAccess
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `idorGuard`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 210

- GÖREV: Dependency audit
- NE İSTİYOR: npm audit --audit-level=high
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `npm audit`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 211

- GÖREV: Backup/restore tests
- NE İSTİYOR: test:backup-restore dry-run
- KOD: server/lib/survival/isolatedDisasterDrill.js
- TEST: Bu ağaçta `proveBackupRestore` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

## Madde 212

- GÖREV: CI evidence
- NE İSTİYOR: PR #430 checks
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `ci`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 213

- GÖREV: Production environment configuration
- NE İSTİYOR: Cannot change production env
- KOD: server/server.js
- TEST: Bu ağaçta `environmentValidation` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

## Madde 214

- GÖREV: Deployment preparation
- NE İSTİYOR: Scripts exist; no deploy
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `deploy`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 215

- GÖREV: External integrations inventory
- NE İSTİYOR: externalIntegrations.js
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `REAL_SUPPLIER`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 216

- GÖREV: Secrets handling
- NE İSTİYOR: No secrets in git
- KOD: server/lib/jwtSecret.js
- TEST: Bu ağaçta `JWT_SECRET` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

## Madde 217

- GÖREV: Monitoring
- NE İSTİYOR: Local health only
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `monitoring`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 218

- GÖREV: Commercial readiness
- NE İSTİYOR: Sales off is truthful catalog mode
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `productionReady`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 219

- GÖREV: Launch controls
- NE İSTİYOR: goLiveApproval
- KOD: server/core/releaseReadinessConstants.js
- TEST: Bu ağaçta `goLive` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

## Madde 220

- GÖREV: Render persistence
- NE İSTİYOR: Prior proof branch; this HEAD UNKNOWN
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `render`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 221

- GÖREV: DNS and access policy
- NE İSTİYOR: No live DNS change
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `DNS`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 222

- GÖREV: Go-live verify script
- NE İSTİYOR: verify-go-live.mjs
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `verify-go-live`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 223

- GÖREV: Provider diagnostics
- NE İSTİYOR: provider-diagnostics.mjs
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `diagnostics`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 224

- GÖREV: Production safety script
- NE İSTİYOR: production-safety.mjs
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `production-safety`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 225

- GÖREV: First real customer order
- NE İSTİYOR: Irreversible
- KOD: server/lib/salesMode.js
- TEST: Bu ağaçta `sales_disabled` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

## Madde 226

- GÖREV: Merge and production deploy
- NE İSTİYOR: Forbidden without human
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `merge`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 227

- GÖREV: Threat detection (safe)
- NE İSTİYOR: Guardian DANGEROUS_PATTERN
- KOD: server/lib/jobEgressGate.js
- TEST: evaluateEgress kodda. Bu sabah egress testi koşulmadı.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Canlı SOC yok.

## Madde 228

- GÖREV: Authorization enforcement (Guardian)
- NE İSTİYOR: aiCanExecute
- KOD: server/lib/controlCenter.js
- TEST: Bu ağaçta `guardian` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

## Madde 229

- GÖREV: Anomaly detection
- NE İSTİYOR: Rate + dangerous pattern
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `anomaly`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 230

- GÖREV: Security telemetry
- NE İSTİYOR: guardian.deny events
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `telemetry`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 231

- GÖREV: Containment safeguards
- NE İSTİYOR: Deny/fail-closed only; no autonomous destructive containment
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `contain`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 232

- GÖREV: Auditability
- NE İSTİYOR: guardian.allow/deny system events
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `audit`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 233

- GÖREV: Agent isolation
- NE İSTİYOR: Tool allow-list + identity required
- KOD: server/lib/security/phase17Evidence.js
- TEST: Bu ağaçta `MEMORY_ISOLATION` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

## Madde 234

- GÖREV: Incident response playbooks
- NE İSTİYOR: Docs + deny path
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `incident`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 235

- GÖREV: Secret scanning in Guardian
- NE İSTİYOR: scanSecrets
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `secret`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 236

- GÖREV: Dangerous pattern block
- NE İSTİYOR: purchase/refund/wire/drop table
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `dangerous`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 237

- GÖREV: Guardian evaluation fail-closed
- NE İSTİYOR: evaluate() catches and denies
- KOD: server/core/part32FinalControlRecoveryConstants.js
- TEST: Bu ağaçta `failClosed` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.
