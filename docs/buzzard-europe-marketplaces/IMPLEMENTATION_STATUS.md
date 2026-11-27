# Uygulama durumu

Tarih: 25 Kasım 2026, 07:34 Europe/Berlin.

Yeni katman `server/lib/marketplace/europe/` altındadır. Mevcut Marketplace Engine, Trendyol adaptörü ve Amazon, eBay, Kaufland, Allegro, bol, Cdiscount, OTTO, eMAG, Skroutz connector dosyaları değiştirilmedi. Bu dokuz kanal `EXISTING_UNTOUCHED` olarak okunur. Çağrı `EXISTING_CONNECTOR_UNTOUCHED` döner ve eski modül yüklenmez.

Ayrı kayıt seçildi çünkü mevcut registry testi kanal sayısını kilitliyor. O dosyaya eklemek mevcut testi ve connector kodunu değiştirirdi.

## Ortak davranış

- Varsayılan HTTP istemcisi yok. Taşıyıcı yalnızca test enjekte ederse çalışır.
- `EUROPE_MARKETPLACE_LIVE=1` `LIVE_CALLS_FORBIDDEN` döner. Taşıyıcı çağrılmaz.
- Kimlik yoksa veya platform kapalıysa taşıyıcı çağrılmaz.
- `live`, `network`, `productionReady` ve `salesEnabled` false kalır.
- Fiyat `pricingEngine.quote` ve `evaluateOffer` ile hesaplanır. Komisyon veya diğer maliyet yoksa `PRICING_NOT_VERIFIED`. Minimum net kâr değiştirilmedi.
- Stok `stockEngine.inspectFeeds` ile okunur. 24 saatten eski kayıt `STALE_STOCK`.
- KDV `vatEngine.calculateVat` ile eklenir. Sonuç fiyatın yerine geçmez.
- İade `startReturn` ile açılır. Etiket ve para iadesi `false` kalır. İkinci bir lojistik motoru yok.
- Sipariş taslağı `persisted: false` ve `orderCreated: false`. Aynı dış sipariş numarası `DUPLICATE_ORDER`.
- Loglar Authorization, API anahtarı ve imza sırrını yazmaz.
- Hız sınırı, yeniden deneme ve bellek içi idempotency istemcidedir. Mirakl teklif grubunun yerel sınırı belgedeki üst sınıra uyar: dakikada 1.

## Yazılan ve test edilen aileler

| Aile | Kayıtlar | Ne gönderilebilir | Ne gönderilmez |
| --- | --- | --- | --- |
| Mirakl | MediaMarkt/Saturn/MediaWorld, Conrad, Decathlon, Worten, Carrefour, Leroy Merlin, La Redoute, Home24, Douglas, Fressnapf | OF24 teklif, P41 dosya içe aktarma (yalnızca verilen operator dosyası), OR11 sipariş, OR23 takip, OR24 sevk, OR29 iptal, OR28 iade gövdesi | Operator kategori şablonu yoksa ürün dosyası. Host kodda yoktur. |
| Etsy Open API v3 | Etsy | İlan oluşturma ve stok yolu | Görsel, takip, iptal ve iade yolları bu turda belgeden alınmadı. |
| Back Market | Back Market | `/ws/listings`, `/ws/orders`, sipariş güncelleme yolu | Care iade yolu alınmadı. |
| ManoMano | ManoMano | Sipariş, kabul, red, kargo, iade, teklif okuma | Teklif PATCH adresi ve ürün oluşturma yolu alınmadı. |
| Vinted Pro | Vinted | Ürün gövdesi ve HMAC adımları | Webhook kaydı kapalı. Kargo etiketi oluşturulmaz. İade yolu belgede yok. |
| Shöpping | Shöpping.at | Sipariş GET/POST yolu | Ürün ve fiyat CSV feed. Güncelleme gövdesi resmi XML değilse gönderilmez. |
| AlzaTrade | Alza | Sipariş ve kategori şablonu yolları | Ürün yazma, fiyat ve kargo yazma yolu sayfada yok. API hostu env ister. |
| Refurbed | Refurbed | `OrderService.ListOrders` | Üretim hostu `api.refurbed.com` engellenir. Ürünü satıcı yaratamaz. İade RPC adı alınmadı. |
| Dosya | Galaxus, Digitec | Yok | REST yolu yoktur. `FILE_EXCHANGE_ONLY`. |

Mirakl eşlemesi, bu turda okunan Mirakl ve ChannelPartner sayfalarına dayanır. Empik, Boulanger, Rue du Commerce, El Corte Inglés ve B&Q bu sayfalarda doğrulanmadığı için Mirakl adaptörüne bağlanmadı.

## Bilerek yazılmayanlar

`SELLER_ACCESS_REQUIRED`, `RESEARCH_REQUIRED`, `NO_OFFICIAL_API` ve `NOT_ELIGIBLE` kayıtları endpoint taşımaz. Portal adresi bilinenlerde adres notta durur. Uydurma URL yoktur.

Müşteri kaydı yazılmaz. Sipariş, Order Engine'e insert edilmez. `BUZZARD_SALES_ENABLED` değiştirilmedi.
