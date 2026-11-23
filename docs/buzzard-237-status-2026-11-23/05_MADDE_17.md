# Madde 17 — Diagnostic / Guardian / Orchestrator / DB GET protection

Tarih: 23 Kasım 2026, 07:28 Europe/Berlin.
Ağaç: `cursor/237-morning-status-c293`.
Satış kilitli. Kod, korunan JSON, satış kilidi ve egress değişmedi.
Görev cümlesi ve kabul ölçütü değiştirilmedi: Unauthenticated diagnostic prefixes 401.

Nihai durum: 🟡 Kısmen tamamlandı

Madde 16’nın HTTP sonuçları bu madde için kanıt sayılmadı. Madde 17 ilk turda da 🟡 idi. Bu tur sayıları değiştirmedi.

## Görev tanımı

Oturum taşımayan istek, diagnostic, Guardian, Orchestrator ve DB GET öneklerinde 401 almalıdır.

## Bulunan kaynak kodlar

- `server/lib/routePermissions.js`
  - `PUBLIC_ROUTES` satır 45–46: `GET /api/orchestrator/status` ve `GET /api/guardian/status` herkese açık.
  - Aynı kümede `GET /api/health`, `GET /api/health/db` ve `GET /api/health/security-readiness` de var.
  - `PREFIX` satır 176: `/api/admin/guardian` okuması `security.read`.
  - `resolveRoutePermission` satır 365: eşleşme yoksa `null`. `globalAuthMiddleware.js` bu durumda işleyiciyi olduğu gibi bırakır.
- `server/plugins/guardianBridgePlugin.js`
  - `GET /api/guardian/status` satır 11: kimlik kontrolü yok.
  - `GET /api/guardian/health` satır 15: adres yoksa 503. Adres varsa kimlik sormadan upstream’e gider.
  - `GET /api/admin/guardian/approvals|incidents|costs`: önce `requireAuth`, sonra `products.read`.
- `server/lib/guardianBridge.js` `getGuardianStatus` satır 63: adres varsa cevapta `guardianUrl` döner.
- `server/plugins/orchestratorBridgePlugin.js`
  - `GET /api/orchestrator/status` satır 9: kimlik yok.
  - `GET /api/orchestrator/agents` ve `/tasks`: adres yoksa 503, varsa kimlik yok.
- `server/lib/orchestratorBridge.js` `getOrchestratorStatus` satır 66: adres varsa cevapta `orchestratorUrl` döner.
- `server/plugins/databasePlugin.js`
  - `GET /api/db/status` satır 78: kimlik yok. `ok`, `service`, `version`, `storage` döner.
  - `GET /api/db/orders` ve `GET /api/db/orders/:orderNumber`: `dbAuth.requireAuth`.
  - `GET /api/db/admin/orders` ve `GET /api/db/admin/products`: `dbAuth.requireAdmin`.
- `server/lib/dbAuth.js` `requireAuth` satır 110: token yoksa 401 `Authentication required`. Token doğrulanamazsa 401 `Invalid or expired token`.
- `server/lib/auth.js` `requireAuth` satır 705: admin oturumu yoksa `admin.auth.required`.

## Test dosyaları

`server/__tests__/adminRouteMatrix.test.mjs` herkese açık rota listesinin `GET /api/guardian/status` ve `GET /api/orchestrator/status` içermesini bekler. Bu, 401 ölçütünün tersini kilitler. Bu turda o dosya koşulmadı.

Bu turun kanıtı, `isolatedApi.mjs` ile açılan loopback süreçtir. `BUZZARD_SALES_ENABLED=0`. Guardian ve Orchestrator adresi verilmedi. Süreç ölçüm bitince durdu.

## Gerçek HTTP sonuçları

Saat 07:28 Europe/Berlin. Tokensuz GET:

| Rota | HTTP | Gövde |
| --- | --- | --- |
| `/api/admin/guardian/approvals` | 401 | `admin.auth.required` |
| `/api/admin/guardian/incidents` | 401 | `admin.auth.required` |
| `/api/admin/guardian/costs` | 401 | `admin.auth.required` |
| `/api/db/orders` | 401 | Authentication required |
| `/api/db/orders/missing` | 401 | Authentication required |
| `/api/db/admin/orders` | 401 | Authentication required |
| `/api/db/admin/products` | 401 | Authentication required |
| `/api/guardian/status` | 200 | `configured`, `reachable`, `guardianUrl`, `message` |
| `/api/orchestrator/status` | 200 | `configured`, `reachable`, `orchestratorUrl`, `message` |
| `/api/guardian/health` | 503 | `guardian_not_configured` |
| `/api/orchestrator/agents` | 503 | `orchestrator_not_configured` |
| `/api/orchestrator/tasks` | 503 | `orchestrator_not_configured` |
| `/api/db/status` | 200 | `ok`, `service`, `version`, `storage` |
| `/api/health` | 200 | modül adları, ticari ve veritabanı alanları |
| `/api/health/db` | 200 | `database` |
| `/api/health/security-readiness` | 200 | `SECURITY_READINESS` |

Bu çağrıların hiçbirinde stack izi yoktu. `guardianUrl` ve `orchestratorUrl` alanları cevapta vardı. Değerleri bu ortamda boştu.

Aynı admin oturumuyla:

- `/api/admin/guardian/approvals` 503 `guardian_not_configured`. Oturum kapıyı geçti, upstream adresi yoktu.
- `/api/db/orders` ve `/api/db/admin/orders` 401 `Invalid or expired token`. Admin oturum belirteci DB belirteci sayılmadı.

## Entegrasyon

Admin Guardian rotası `routePermissions` üzerinden `security.read` ile admin oturumuna bağlı. DB sipariş rotası ayrı `dbAuth` belirtecine bağlı. İkisi aynı Bearer başlığını paylaşmıyor. Guardian ve Orchestrator durum rotaları bu iki kapıdan geçmiyor. `PUBLIC_ROUTES` onları herkese açık sayıyor. Eşleşmeyen health ve agents rotalarında orta katman politika üretmiyor. İşleyici kendisi 503 veriyor.

## Güvenlik bulguları

- Admin Guardian ve DB sipariş/ürün GET uçları tokensuz istekte 401. Ölçütün bu parçası duruyor.
- Guardian status, Orchestrator status, DB status ve health GET uçları tokensuz 200. Ölçüt bunlarda durmuyor.
- Guardian health ile Orchestrator agents ve tasks, adres yokken 401 yerine 503. Adres varken kod, oturum aramadan upstream’e gider. Bu turda adres yoktu.
- Adres doluysa status cevapları URL alanını doldurur. Bu ortamda alan boştu. Dolu adresle sızıntı HTTP ile görülmedi.

## Eksik işler

- Diagnostic, Guardian status, Orchestrator status ve DB status öneklerinin tokensuz istekte 401 olması.
- Health, agents ve tasks için oturum kapısı.
- Herkese açık listeyi 401 ölçütüyle çelen matris testinin bu maddeyle bağdaşması.

## Kanıtlanamayan noktalar

- `BUZZARD_GUARDIAN_URL` veya `BUZZARD_ORCHESTRATOR_URL` doluyken status ve health cevapları. Adres verilmedi. Egress deny duruyor.
- `adminRouteMatrix.test.mjs` bu turda koşulmadı. Onun herkese açık beklentisi bu HTTP tablosunun yerine geçmez.
- DB admin rotasında geçerli bir müşteri `admin` rolüyle 200 alınabildiği. Yalnızca admin oturum belirteci denendi ve DB kapısı onu reddetti.

## Nihai durum

🟡 Kısmen tamamlandı
