# API ve satıcı gereksinimleri

Hiçbir kayıtta API anahtarı, secret veya token yoktur. Aşağıdaki yollar resmi belgeden kopyalandı. Listede olmayan işlem koda endpoint olarak girmedi.

## Mirakl MMP satıcı API

Kaynak: `developer.mirakl.com` satıcı OpenAPI sayfaları, 25 Kasım 2026.

- Kimlik: `Authorization` içinde Shop API key.
- `POST /api/products/imports` (P41, multipart dosya).
- `POST /api/offers` (OF24). Zorunlu alanlar: `price`, `shop_sku`, `state_code`, `update_delete`; oluşturmada `product_id` ve `product_id_type`.
- `GET /api/orders` (OR11).
- `PUT /api/orders/{order_id}/tracking` (OR23).
- `PUT /api/orders/{order_id}/ship` (OR24, gövdesiz, `Content-Length: 0`).
- `PUT /api/orders/{order_id}/cancel` (OR29, gövdesiz).
- `PUT /api/orders/refund` (OR28).

OF24 için belgedeki üst kullanım dakikada birdir. Operator hostu satış açılışında verilir. `EUROPE_<PLATFORM>_BASE_URL` boşsa çağrı olmaz.

Bu aileye bağlananlar: MediaMarkt Marketplace, Conrad, Decathlon, Worten, Carrefour, Leroy Merlin, La Redoute, Home24, Douglas, Fressnapf.

## Etsy Open API v3

Kaynak: `developers.etsy.com`.

- Taban: `https://api.etsy.com`.
- `POST /v3/application/shops/{shop_id}/listings`
- `PATCH /v3/application/shops/{shop_id}/listings/{listing_id}`
- `PUT /v3/application/listings/{listing_id}/inventory`
- `GET /v3/application/shops/{shop_id}/receipts`
- Başlık `x-api-key`: keystring ve shared secret.

`taxonomy_id`, `who_made` ve `when_made` çağırandan gelir. Kod kategori numarası uydurmaz.

## Back Market

Kaynak: `api.backmarket.dev`.

- Stage: `https://preprod.backmarket.fr`. Production: `https://www.backmarket.fr`.
- `POST /ws/listings`, `GET /ws/orders`, `POST /ws/orders/{order_id}`.
- `Authorization: Basic`, `Accept-Language`, zorunlu `User-Agent`.

## ManoMano Partners API

Kaynak: `partnersapi.manomano.com` ve sandbox hostu.

- `GET /orders/v1/orders` ve `GET /orders/v1/orders/{order_reference}`
- `POST /orders/v1/accept-orders`
- `POST /orders/v1/refuse-orders`
- `POST /orders/v1/shippings`
- `POST /orders/v1/refunds`
- `GET /api/v1/offer-information/offers`
- Kimlik: `x-api-key`. Yazma kotası belgede IP başına saatte 200.

Teklif güncellemenin PATCH adresi bu belgeden satır olarak çıkmadı. O işlem `OFFER_UPDATE_PATH_NOT_CAPTURED` döner.

## Vinted Pro

Kaynak: `pro-docs.svc.vinted.com`, sürüm notu v0.394.0.

- Sandbox: `https://pro-public-sandbox.svc.vinted.com`
- Production: `https://pro.svc.vinted.com`
- `POST /api/v1/items`, `PUT /api/v1/items`, `GET /api/v1/orders`, `POST /api/v1/orders/{id}/cancel`, `GET /api/v1/orders/{id}/shipment`, `GET /api/v2/ontologies`
- İmza: `timestamp.METHOD.path.accessKey.body` üzerinde HMAC-SHA256. Başlık `t=<unix>,v1=<hex>`.
- Allowlist gerekir. Ürünler `is_draft: true` gider. Webhook kaydı kapalıdır.

Belgelerdeki örnek özet, ayıklanan örnek gövdeyle yeniden üretilemedi. Test, yazılı birleştirme sırasını doğrular.

## Shöpping.at

Kaynak: merchant API specification v1.27, Temmuz 2025.

- `GET` ve `POST https://portal.shoepping.at/ws/v1/orders`
- `GET https://portal.shoepping.at/ws/v1/returnAnnouncements`
- Ürün, fiyat ve stok CSV feed. REST ürün yolu yazılmadı.

## AlzaTrade

Kaynak: `https://www.alza.cz/alzatrade-api`.

- Token: `POST https://identity.alza.cz/connect/token` (`client_credentials`).
- `GET /orders`, `GET /orders/unshipped`
- `GET /listings/categories`, `/listings/categories/tree`, `/listings/manufacturers`, `/listings/templates`
- Trade API hostu belgede sabit bir üretim adresi olarak verilmediği için `EUROPE_ALZA_BASE_URL` zorunludur.

## Refurbed

Kaynak: public merchant API README.

- Belgelenen üretim hostu `api.refurbed.com:443`. Adaptör bu hostu reddeder.
- `OrderService.ListOrders` ve `InstanceService` okuması.
- Kimlik: `Authorization: Plain <token>`.
- Sandbox hostu hesap yöneticisinden gelir.

## Yolu kopyalanmayan portallar

Zalando zDirect, Temu Partner Platform, SHEIN Open Platform, TikTok Shop Seller API, Wayfair Developer Portal, Hood.de Platin API ve OnBuy `/v2` belgeleri vardır. Endpoint listesi bu koda alınmadı. Durum `SELLER_ACCESS_REQUIRED`.

Galaxus ve Digitec için herkese açık REST API bulunamadı. Resmi yöntem satıcı dosya değişimidir.

## Mevcut ve dokunulmayanlar

Amazon SP-API, eBay Sell, Kaufland, Allegro, bol, Cdiscount, OTTO, eMAG ve Skroutz kendi sandbox connector'larında durur. Bu görev onların kimlik env adlarını değiştirmedi.
