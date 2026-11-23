# Madde 16 — Guest commerce proof for cart/checkout/order

Tarih: 23 Kasım 2026, 06:50 Europe/Berlin.
Ağaç: `cursor/237-morning-status-c293`.
Satış kilitli (`BUZZARD_SALES_ENABLED=0`). Kod, korunan JSON, satış kilidi ve egress değişmedi.
Görev cümlesi ve kabul ölçütü değiştirilmedi: Guest without session/token fail-closed.

Nihai durum: 🟡 Kısmen tamamlandı

## Görev tanımı

Misafir, oturum veya token olmadan sepet, checkout ve sipariş yolunda fail-closed kalmalıdır. Bu turda aynı yolların gerçek HTTP davranışı da ölçüldü. Madde 7 ve madde 15’in testleri kanıt olarak kullanılmadı.

## Bulunan kaynak kodlar

- `server/plugins/commerceCorePlugin.js`
  - `POST /api/commerce/cart` satır 59: token istemez, `customerId` ve `sessionId` gövdeden gelir.
  - Ürün ekleme, miktar, silme, checkout start, validate, complete ve `GET /api/commerce/orders/:id` aynı dosyada.
- `server/lib/commerce/cartService.js`
  - `createCart` satır 66: `customer_id` boş kalabilir.
  - `addItem` satır 153: sunucu fiyatı `resolveAuthoritativePrice`. `clientPrice` uyuşmazsa `price_tampering`.
  - `removeItem` satır 261: satırı siler, erişim kontrolü sonraki `getCart` çağrısındadır.
- `server/lib/commerce/commerceGuards.js`
  - `assertCustomerResourceAccess` satır 60: istekte müşteri kimliği yoksa `auth_required`. Farklı kimlikte `idor_denied`.
  - `getCart` ve `getOrder` bu sonucu yalnızca kayıtta `customer_id` doluysa uygular.
  - `resolveOrderType`: satış kapalıyken `COMMERCIAL` bloklanır, boş tip `DRY_RUN` olur.
- `server/lib/commerce/checkoutService.js`
  - `startCheckout` satır 84, `validateCheckout` satır 110, `completeCheckout` satır 238.
  - `completeCheckout` idempotency anahtarıyla sarılır. `capture: true` `paymentService.capturePayment` döner ve checkout `FAILED` olur.
- `server/lib/commerce/orderService.js`
  - `createOrderFromCheckout` satır 141, `recordCanonicalOrder` `commerce_orders` tablosuna yazar.
  - `mapOrder` kalemleri ve toplamları döner. Fatura adresi bu nesnede yok.
- `server/lib/commerce/inventoryIntegration.js`
  - `reserve` satır 41: `inventory_sot_reservations` yazar. Ürün stok sütununu değiştirmez.
- `server/lib/commerce/paymentService.js`
  - `authorizePayment` her zaman `dryRun: true`.
  - `capturePayment` satır 115: `PAYMENT_NOT_LIVE`.
- `server/plugins/ordersPlugin.js`
  - `POST /api/orders` satır 336: ilk iş `requireSalesEnabled`. Satış kapalıysa sipariş yazılmaz.
  - Satır 473: satış açılsaydı müşteri `guest` olarak işaretlenirdi. Bu dal kapalıyken o satıra ulaşılmadı.
- `server/lib/salesMode.js` `requireSalesEnabled` satır 27.

Ayrı bir misafir hesap tablosu bu akışta yok. Misafir, `customer_id` boş bir sepet ve sipariş kaydıdır.

## Test dosyaları

Depodaki `server/__tests__/adminRouteMatrix.test.mjs` bu yazma rotalarını `guest` diye sınıflar. Sınıfın testi, boş istekte 500 dönmemesini bekler. Başarılı bir misafir siparişini veya fail-closed sonucunu assert etmez. Bu turda o dosya yeniden koşulmadı.

Bu turun kanıtı, depo dışındaki geçici bir istemcinin `server/__tests__/support/isolatedApi.mjs` ile açtığı loopback süreçtir. Süreç `127.0.0.1`, geçici SQLite ve `BUZZARD_SALES_ENABLED=0` ile kalktı, ölçüm bitince durduruldu. Üretim verisine yazılmadı. Canlı ödeme başlatılmadı.

## Gerçek HTTP sonuçları

Saat 06:50 Europe/Berlin. Ürün, admin tokenı ile izole kataloga yazıldı: durum READY, görünürlük PUBLIC, stok 5, fiyat 12.50. Sonraki sepet ve sipariş çağrıları token taşımadı.

| Senaryo | HTTP | Sonuç |
| --- | --- | --- |
| Misafir sepet oluşturma | 200 | Sepet oluştu, `customer_id` boş |
| Ürün ekleme | 200 | 1 kalem, ara toplam 12.50 |
| Sepeti görme | 200 | Aynı ara toplam |
| Miktarı 2 yapma | 200 | Ara toplam 25 |
| Kalemi silme | 200 | Kalem sayısı 0 |
| Yeniden ekleme | 200 | Ara toplam 25 |
| Sahte fiyat 0.01 | 400 | `price_tampering` |
| Olmayan ürün | 404 | `product_not_found` |
| 99 adet | 400 | `insufficient_stock` |
| Ticari checkout | 403 | `sales_disabled` |
| Kuru checkout başlatma | 200 | `DRY_RUN`, durum DRAFT |
| İstemci toplamı | 400 | `client_totals_rejected` |
| Adresle doğrulama | 200 | Sunucu toplamı 34.74, `dryRun` true, `salesEnabled` false |
| Tamamlama | 200 | `DRY_RUN` sipariş, `realMoneyMovement` false |
| Aynı idempotency anahtarı | 200 | `idempotencyReplay` true, aynı sipariş |
| Token olmadan sipariş okuma | 200 | Durum CONFIRMED, 1 kalem, müşteri boş |
| Token olmadan checkout okuma | 200 | Fatura ve teslimat adresi cevapta var |
| `capture: true` | 403 | `PAYMENT_NOT_LIVE`, checkout FAILED |
| `POST /api/orders` misafir gövdesi | 403 | `sales_disabled` |
| Başka `customerId` ile sepet okuma | 403 | `idor_denied` |
| Müşterisiz sahip sepetini okuma | 401 | `auth_required` |
| Başka müşteri kimliğiyle silme | 403 | Cevap red, sahip sepetinin kalem sayısı 0 |
| Bozuk JSON | 400 | Yalnız `security.invalidJson`, stack yok |

## Veritabanı doğrulaması

Geçici SQLite, sunucu durmadan önce okundu.

- `commerce_orders`: 1 satır. Tip `DRY_RUN`, durum `CONFIRMED`, ödeme durumu `AUTHORIZED`, toplam 34.74, `customer_id` boş.
- Aynı tamamlama iki kez gitti. Sipariş sayısı 1 kaldı.
- `commerce_carts`: 3 satır.
- `inventory_sot_reservations`: 1 satır.
- Ürün stok sütunu 5 kaldı.
- `commerce_idempotency` içinde `checkout_complete` kapsamı 2 satır: kuru tamamlama ve başarısız tahsilat denemesi.

## Modüller arası entegrasyon

Aynı HTTP zinciri şunu gösterdi:

1. Sepet kalemi, katalogdaki 12.50 fiyatla yazıldı. İstemcinin 0.01 fiyatı reddedildi.
2. Checkout, sepet boşken `cart_empty` döndü. Dolu sepette `DRY_RUN` taslağı açtı.
3. Doğrulama ara toplam 25 üzerine kargo ve vergi ekleyip 34.74 yazdı. İstemci toplamı bu adımdan önce reddedildi.
4. Tamamlama mock yetkilendirme üretti, `commerce_orders` satırını yazdı ve bir gölge rezervasyon bıraktı.
5. Tahsilat ayrı bir checkout’ta `PAYMENT_NOT_LIVE` ile durdu. Sipariş sayısı artmadı.
6. Vitrin `POST /api/orders` satış kapısından önce döndü. Misafir bayrağını yazan satıra gelinmedi.

Bu bağ, dosyaların yan yana durmasından değil, tek izole süreçteki cevap ve tablo sayımlarından gelir.

## Güvenlik bulguları

- Oturum veya token olmadan sepet, kuru checkout ve kuru sipariş oluşuyor. Maddenin fail-closed ölçütü bu yolda karşılanmıyor.
- Ticari checkout ve vitrin siparişi satış kilidinde 403 ile duruyor. Tahsilat canlı değil.
- `customer_id` boş olan sipariş ve checkout, kimliği bilen tokensuz istekte açılıyor. Checkout cevabı fatura ve teslimat adresini taşıyor.
- Müşterisi dolu sepette okuma reddediliyor. `removeItem` silmeyi bu kontrolden önce yaptığı için yabancı kimlikli silme 403 dönmesine rağmen kalemi yok etti.
- Fiyat ve stok hataları sabit bir `message` alanı taşıyor. Bozuk JSON cevabı yalnız `errorKey`. Bu çağrılarda stack izi yok. Her hata yolu için ayrı bir sızıntı testi yok.

## Eksik işler

- Misafir kuru akışın token olmadan kapanması.
- Boş `customer_id` kayıtlarının kimlik bilgisini yetki saymaması.
- `removeItem` ve `updateItemQuantity` içinde yazmadan önce erişim kontrolü. Silme HTTP ile görüldü. Miktar güncellemesinin aynı sırayı izlediği kodda duruyor, bu turda ayrıca çağrılmadı.
- Misafir için ayrı bir hesap ve sipariş takip kimliği yok. Takip, tahmin edilmesi zor kayıt kimliğiyle yapılıyor.

## Kanıtlanamayan noktalar

- Satış açıkken misafir ticari siparişinin davranışı. Satış kilidi kaldırılmadı.
- Canlı ödeme, canlı stok düşümü ve tedarikçi siparişi. Tahsilat reddedildi, ürün stoğu değişmedi.
- `adminRouteMatrix.test.mjs` bu turda koşulmadı. Onun 500 altı beklentisi bu HTTP senaryolarının yerine geçmez.
- Başarısız tahsilattan sonra ikinci checkout’un sipariş yazmadığı, toplam sipariş sayısının 1 kalmasından çıkar. Ayrı bir “ödeme düştü, sipariş iptal” durum makinesi bu çağrıda yok. Checkout durumu `FAILED`.

## Nihai durum

🟡 Kısmen tamamlandı
