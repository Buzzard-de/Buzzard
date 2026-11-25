# Test sonuçları

25 Kasım 2026, 07:34 Europe/Berlin.

Komut:

`npx vitest run server/__tests__/europeMarketplaces.test.mjs server/__tests__/marketplaceConnectorRegistry.test.mjs server/__tests__/trendyolAdapter.test.mjs`

Sonuç: 3 dosya, 23/23 geçti. Süre 227 ms.

## Avrupa adaptörü (10)

- Görevdeki her platform adı bir kayda çözülür. Bütün sağlık kayıtlarında `live`, `network` ve `productionReady` false.
- Kimlik yokken ve `EUROPE_MARKETPLACE_LIVE=1` iken taşıyıcı 0 kez çağrılır.
- MediaMarkt Mirakl teklifi `POST /api/offers` yoluna gider. Fiyat motorun fiyatıdır, adet stok motorundan gelir. Aynı gövde ikinci kez taşınmaz. API anahtarı logda ve sağlık çıktısında görünmez.
- Komisyon yoksa `PRICING_NOT_VERIFIED`. 25 saatlik stok `STALE_STOCK`. İkisi de taşıyıcıya gitmez.
- Conrad siparişi `WAITING_ACCEPTANCE` için `PENDING` taslaktır. `persisted` ve `orderCreated` false. Aynı numara `DUPLICATE_ORDER`. İade `labelIssued: false`.
- 503 üç denemede düzelir. 401 bir kez denenir.
- Yerel Mirakl limiti 1 iken ikinci farklı teklif `RATE_LIMITED` olur ve tek taşıma yapılır.
- Etsy ilanı `/v3/application/shops/10/listings` yolundadır. `taxonomy_id` yoksa taşıma olmaz.
- Vinted imzası `timestamp.METHOD.path.accessKey.body` sırasını üretir.
- Amazon `EXISTING_CONNECTOR_UNTOUCHED`, Galaxus `FILE_EXCHANGE_ONLY`, Zalando `SELLER_ACCESS_REQUIRED`, Kleinanzeigen `NO_OFFICIAL_API`, MediaMarkt için Norveç `COUNTRY_NOT_SUPPORTED`. Taşıyıcı 0.

## Korunan mevcut testler (13)

Trendyol adaptörü 11/11. Marketplace registry 2/2. Kanal sayısı 11 olarak kaldı. Trendyol dosyaları bu görevde değiştirilmedi.

## Üretim veritabanı

`server/data/buzzard.db`

SHA-256 `27d460eca7461f5093406296256be9c9d98b45eaf5493ab91192483902fc0a0f`

Boyut 1744896.

Gerçek pazar yeri çağrısı yapılmadı. Satış kilidi açılmadı.
