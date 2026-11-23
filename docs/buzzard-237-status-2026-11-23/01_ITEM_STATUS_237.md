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

- ✅ 0
- 🟡 92
- 🔴 1
- ⛔ 1
- ⚪ 143

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
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `HttpOnly`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

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
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `sendPublicError`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 16

- GÖREV: Guest commerce proof for cart/checkout/order
- NE İSTİYOR: Guest without session/token fail-closed
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `guest`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 17

- GÖREV: Diagnostic / Guardian / Orchestrator / DB GET protection
- NE İSTİYOR: Unauthenticated diagnostic prefixes 401
- KOD: server/lib/rbac.js
- TEST: Bu ağaçta `system.read` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

## Madde 18

- GÖREV: Data protection and durable storage design
- NE İSTİYOR: App data not persisted in /tmp; intended DB path used
- KOD: server/lib/dbStartup.js
- TEST: Bu ağaçta `dbPaths` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

## Madde 19

- GÖREV: Project integrity: commercial locks stay off
- NE İSTİYOR: SALES, SoT, LIVE_PAYMENTS remain off; no fail-open auth wrappers
- KOD: server/lib/salesMode.js
- TEST: Satış kilidi kodda. phase1 invariant salesLocked true bekliyor; phase1 yüzdesi bu sabah 91.7.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Kilit duruyor. Korunan veri kontrolü kırmızı.

## Madde 20

- GÖREV: Shared commerce constants and state machines
- NE İSTİYOR: Checkout and order transitions enforced
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `state machine`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 21

- GÖREV: Common error contracts
- NE İSTİYOR: Public error keys without stack traces
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `errorKey`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 22

- GÖREV: Cart data contract
- NE İSTİYOR: Server-owned totals; session binding
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `addItem`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 23

- GÖREV: Checkout data contract
- NE İSTİYOR: Sales lock; guest proof
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `checkout`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 24

- GÖREV: Order data contract
- NE İSTİYOR: Guest token stripped from public map
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `cancelOrder`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 25

- GÖREV: Product data contract
- NE İSTİYOR: Canonical product fields via PIM core
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `canonicalProduct`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 26

- GÖREV: Core DB schema and migrations
- NE İSTİYOR: Additive software/pusat tables
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `migrations`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 27

- GÖREV: Shared quantity and total validation
- NE İSTİYOR: Negative qty and client totals rejected
- KOD: server/lib/returnsRma.js
- TEST: Bu ağaçta `quantity` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

## Madde 28

- GÖREV: Idempotency-key plumbing
- NE İSTİYOR: Sensitive commerce operations accept Idempotency-Key
- KOD: server/lib/paymentsFinance.js
- TEST: Bu ağaçta `idempotency` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

## Madde 29

- GÖREV: Request correlation IDs
- NE İSTİYOR: X-Request-Id / X-Correlation-Id on API
- KOD: server/server.js
- TEST: Bu ağaçta `correlation` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

## Madde 30

- GÖREV: Software facade is not a second orchestrator
- NE İSTİYOR: server/lib/software wraps existing engines
- KOD: server/lib/controlCenter.js
- TEST: Bu ağaçta `orchestratorBridge` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

## Madde 31

- GÖREV: API health endpoints
- NE İSTİYOR: Health remains rate-limited on its own bucket
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `/api/health`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 32

- GÖREV: Plugin / route registry
- NE İSTİYOR: wrapRouteHandler on registered routes
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `plugins`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 33

- GÖREV: Catalog vs commerce mode split
- NE İSTİYOR: Sales off => catalog mode
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `sales_disabled`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 34

- GÖREV: Core shared-service test harness
- NE İSTİYOR: Vitest unit suite for commerce core
- KOD: server/plugins/ecosystemPlugin.js
- TEST: Bu ağaçta `phase1CoreIntegrity` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

## Madde 35

- GÖREV: Pusat orchestrator core
- NE İSTİYOR: Initialize, dispatch, health
- KOD: server/__tests__/pusatOrchestrator.test.mjs
- TEST: Pusat orkestratör testi bu sabah geçti.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Canlı model yok.

## Madde 36

- GÖREV: Agent registry and coordination
- NE İSTİYOR: Employee/agent registry
- KOD: server/lib/workstreams/special16Runtime.js
- TEST: Bu ağaçta `specialistDispatch` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

## Madde 37

- GÖREV: Central AI memory
- NE İSTİYOR: Host/kv style memory in Pusat
- KOD: server/lib/pusat/durable.js
- TEST: Bu ağaçta `putMemory` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

## Madde 38

- GÖREV: Specialist agents
- NE İSTİYOR: Named agents with tools
- KOD: server/core/constants.js
- TEST: Bu ağaçta `price_ai` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

## Madde 39

- GÖREV: Task orchestration
- NE İSTİYOR: Tasks wait on approval
- KOD: server/lib/comms/whatsappSandbox.js
- TEST: Bu ağaçta `durableTaskQueue` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

## Madde 40

- GÖREV: Pusat error handling fail-closed
- NE İSTİYOR: Exceptions classified; payments not retried
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `fail-closed`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 41

- GÖREV: AI governance: cannot self-approve
- NE İSTİYOR: decide() rejects requesting agent / AI identity
- KOD: server/lib/controlCenter.js
- TEST: decideApproval var. Bu, kendini onaylama yasağının kanıtı değil.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Düşük risk policy:low-risk ile otomatik APPROVED oluyor. Yasağın testi yok.

## Madde 42

- GÖREV: Dispatch idempotency
- NE İSTİYOR: Durable read-only dispatch keys
- KOD: server/lib/pusat/idempotencyService.js
- TEST: Bu ağaçta `idempotencyService` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

## Madde 43

- GÖREV: Worker integration
- NE İSTİYOR: Pusat worker hooks
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `worker`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 44

- GÖREV: Agent approval requests
- NE İSTİYOR: requestApproval bound to input hash
- KOD: server/lib/pusat/orchestrator.js
- TEST: Bu ağaçta `submitApproval` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

## Madde 45

- GÖREV: Pusat exception dead-letter
- NE İSTİYOR: Retry then DEAD_LETTER
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `dead-letter`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 46

- GÖREV: Memory and Guardian tests
- NE İSTİYOR: Guardian deny + memory tests
- KOD: server/lib/pusat/durable.js
- TEST: Bu ağaçta `PERSONAL_MEMORY_DENIED` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

## Madde 47

- GÖREV: Stub vs live LLM providers
- NE İSTİYOR: Stub default; live not claimed
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `liveTts`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 48

- GÖREV: AI tool rate limit
- NE İSTİYOR: Guardian per-agent rate window
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `rate limit`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 49

- GÖREV: Agent isolation via permissions
- NE İSTİYOR: aiCanExecute + tool allow-list
- KOD: server/lib/security/phase17Evidence.js
- TEST: Bu ağaçta `MEMORY_ISOLATION` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

## Madde 50

- GÖREV: Sensitive action classification
- NE İSTİYOR: SENSITIVE_ACTIONS require approval
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `HIGH`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 51

- GÖREV: Orchestrator HTTP protection
- NE İSTİYOR: GET /api/orchestrator prefix authenticated
- KOD: server/lib/rbac.js
- TEST: Bu ağaçta `system.read` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

## Madde 52

- GÖREV: Automations non-destructive
- NE İSTİYOR: No autonomous money movement
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `non-destructive`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 53

- GÖREV: Cross-process memory proof
- NE İSTİYOR: Documented in AI completion
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `cross-process`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 54

- GÖREV: Recommendation-only assistants
- NE İSTİYOR: Cannot execute commercial side effects
- KOD: server/lib/commerce/pricingIntegration.js
- TEST: Bu ağaçta `recommendationOnly` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

## Madde 55

- GÖREV: Pusat health/status
- NE İSTİYOR: Health reports stub/live honestly
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `pusat`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 56

- GÖREV: Canonical product model
- NE İSTİYOR: productCore create/read
- KOD: server/__tests__/canonicalProductWriter.test.mjs
- TEST: canonicalProductId yazarı var. Bu sabah koşulmadı.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Test bu oturumda çalıştırılmadı.

## Madde 57

- GÖREV: PIM write boundary
- NE İSTİYOR: authorizeCreate/Update/Delete; actor from session
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `productWrite`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 58

- GÖREV: Customer-facing taxonomy L1
- NE İSTİYOR: 50 customer L1 categories
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `activeL1`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 59

- GÖREV: Category localization
- NE İSTİYOR: DE/EN/TR/AR labels
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `hubSeo`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 60

- GÖREV: Product validation
- NE İSTİYOR: PIM validation / customs decision
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `validateEan`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 61

- GÖREV: Product SoT readiness while inactive
- NE İSTİYOR: activationStatus.activated false even if env flag
- KOD: server/lib/salesSafetyGate.js
- TEST: Bu ağaçta `PRODUCT_SOT` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

## Madde 62

- GÖREV: Dual-write forbidden
- NE İSTİYOR: assertNoDualWrite throws
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `dual-write`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 63

- GÖREV: SKU uniqueness
- NE İSTİYOR: productStore uniqueness
- KOD: server/lib/pim/phase11Evidence.js
- TEST: Bu ağaçta `duplicate_ean` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

## Madde 64

- GÖREV: Catalog SEO
- NE İSTİYOR: createProduct active=0
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `jsonLd`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 65

- GÖREV: JSON product store
- NE İSTİYOR: Optional BUZZARD_PRODUCT_STORE_PATH
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `jsonStore`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 66

- GÖREV: PIM import dry-run
- NE İSTİYOR: No live import without flag
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `dry-run`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 67

- GÖREV: PIM publish gated
- NE İSTİYOR: Publish not SoT activation
- KOD: server/lib/platform/phase3ProductPim.js
- TEST: PIM_LIVE_PUBLISH kapısı var.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Yayın insan onayında. Canlı PIM yok.

## Madde 68

- GÖREV: Storefront catalog read
- NE İSTİYOR: catalogCache / catalogReadService
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `catalog`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

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
- KOD: server/lib/commerce/pricingPolicy.js
- TEST: Fiyat politikası dosyası var.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Kâr tabanı bu sabah yeniden hesaplanmadı.

## Madde 76

- GÖREV: Profit calculation / MIN_NET_PROFIT
- NE İSTİYOR: MIN_NET_PROFIT_EUR 0.50
- KOD: server/lib/commerce/pricingPolicy.js
- TEST: MIN_NET_PROFIT sembolü fiyat politikasında aranacak dosyada duruyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Bu sabah fiyat testi koşulmadı.

## Madde 77

- GÖREV: Supplier integration framework
- NE İSTİYOR: Connector inventory; no real PO
- KOD: server/lib/supplier/dryRunSupplierAdapter.js
- TEST: Bu ağaçta `baseAdapter` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

## Madde 78

- GÖREV: Supplier normalization
- NE İSTİYOR: Feed dry-run CSV/XML/JSON
- KOD: server/lib/jobHandlers.js
- TEST: Bu ağaçta `supplierMapping` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

## Madde 79

- GÖREV: Inventory synchronization (local)
- NE İSTİYOR: stockEngine
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `inventory`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 80

- GÖREV: Supplier availability
- NE İSTİYOR: Adapter class / mock
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `availability`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 81

- GÖREV: Shipping cost calculation local
- NE İSTİYOR: shippingProvider stubs
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `dryShipping`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 82

- GÖREV: Pricing safeguards / no undercut
- NE İSTİYOR: MARKET_UNDERCUT_IMPLEMENTED false
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `undercut`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 83

- GÖREV: Supplier feeds dry-run only
- NE İSTİYOR: No live fetch
- KOD: bu turda maddeye özel dosya açılmadı
- TEST: Aranan iz: `supplierFeed`.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: ⚪
- EKSİK: Sonraki turda bu maddenin dosyası ve testi açılacak.

## Madde 84

- GÖREV: No real purchase orders
- NE İSTİYOR: supplierOrdersEnabled false
- KOD: server/lib/jobSafetyGate.js
- TEST: Bu ağaçta `submitOrder` geçiyor.
- ENTEGRASYON: Ekim kemeri bu dalda yok. Bağ, yukarıdaki dosyanın bu ağaçta durup durmadığı.
- DURUM: 🟡
- EKSİK: Madde numarasına bağlı test bu sabah koşulmadı. Orijinal kabul ölçütü UNKNOWN.

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
