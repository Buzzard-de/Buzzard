# Yedinci tur — 23 Kasım 2026, 11:47 Europe/Berlin

Önceki altı turun kayıt dosyaları bu turda değiştirilmedi. Bu dizin yedinci turun kaydıdır. Başlangıç commit `1d0a67bc`. Satış kilidi kapalı.

## Sayılar

Önceki kayıt: 23 doğrulanan, 209 kısmi, 0 uygulanmayan, 1 dış hesap, 4 doğrulanamayan.

Bu tur madde 30’u katalog servis yazmaları için doğruladı. Yeni sayım:

- Doğrulanan: 24 (önceki 23 ve madde 30)
- Kısmi: 208
- Uygulanmayan: 0
- Dış hesap: 1 (madde 88)
- Doğrulanamayan: 4 (200, 205, 220, 221)

## 1. Madde 30 yazma yolları

Ortak kapı `server/lib/software/control.js`. Yeni çağrı `guardProjection`. Aktör yoksa `ACTOR_REQUIRED` ve satır yazılmaz. Aktör tipi `AI` ise `AI_WRITE_DENIED`. İki yazma hedefi `DUAL_WRITE_FORBIDDEN`. Okuma aktör istemez. Modül kendi kendine `catalog-seo`, `pim30` veya `json-import` aktörü üretmez. Aktör, çağıran oturumdan veya testin verdiği kimlikten gelir.

Kapıya bağlanan servisler:

- Katalog SEO: ürün, kategori, fiyat toplu güncelleme, görsel
- Arama indeksi ve eş anlamlılar
- Eski PIM: ürün, çeviri, özellik, medya, SEO, varyant, içe aktarma kuyruğu
- PIM30: marka, kategori, ürün, çeviri, özellik, medya, varyant
- JSON katalog `productStore.upsertProduct` ve durum değişimi
- Katalog senkronu `syncCatalogProducts`
- Kanonik SEO alanı `seoService.updateSeo`
- Altıncı turdaki kanonik ürün, fiyat, stok, ödeme, sipariş ve tedarikçi yazmaları

Eski PIM30 yazma uçları yönetici oturumu olmadan açıktı. Artık yönetici ve aktör istiyorlar.

## 2. Kapı dışında kalan yazılar

Bunlar katalog servis girişi değil. Madde 30 bu yüzden katalog servisleri için doğrulandı; depo genelindeki her SQL satırı kapıdan geçmiyor.

- `server/lib/db.js` kurulum tohumları, veritabanı dosyası açılırken örnek satır yazar. İstek yolu değil.
- `isolatedDisasterDrill` kendi geçici SQLite dosyasına sentetik satır yazar. Katalog veritabanı değil.
- Arama tıklama olayı `srch_events` tablosuna anonim kayıt düşer. Ürün satırı değiştirmez.
- Kalite puanı, kapıdan geçmiş ürün oluşturmanın içinde güncellenir.
- Kuru iz `software/index.js` içinde `software-facade` kimliğiyle fiyat reddini ve ödemenin canlı olmadığını yoklar. Katalog tablosuna yazmaz.

## 3. Dijital beden

Tek motor `digital_body`. Profiller: Sinan, Esat Bey, Doğu Bey, Mira, Leon, Amelia, Adrian. Ayrı yazılım yok. Konuşma, algılama, sentez, dudak, yüz, kol, gövde, yürüme, oturma, nesne ve kıyafet sağlayıcısı `PROVIDER_ABSENT`. Çizim yok. Sahte sağlayıcı yok.

## 4. Madde 88 ve doğrulanamayanlar

TecDoc `accountVerified: false`. Gerekli adlar: `TECDOC_API_KEY`, `TECDOC_PROVIDER_ID`, `TECDOC_CATALOG_COUNTRY`. Canlı çağrı yok.

- 200: diğer dal manifestoları açılmadı.
- 205: `gh pr checks 515` bu dalda kontrol döndürmedi.
- 220: bu HEAD için Render diski yok.
- 221: DNS değiştirilmedi ve denetlenmedi.

## 5. Test

`itemsSeventhPass.test.mjs` 4/4. Aktörsüz katalog, arama, eski PIM, PIM30 ve senkron satır sayısını değiştirmedi. AI arama indeksi yazamadı. İnsan aktör tek kanonik satır ve tek arama satırı yazdı. SEO aktörsüz `ACTOR_REQUIRED`. Ödeme `PAYMENT_NOT_LIVE`. Tedarikçi `LIVE_ORDER_FORBIDDEN`.

Aynı çalıştırmada geçenler: `canonicalProductWriter` 2/2, `itemsSixthPass` 3/3, `part6Foundation`, `testIsolation`, `itemsFifthPass`, `itemsFourthPassChain`, `itemsPhase3Gaps`.

## 6. Güvenlik

Satış kapalı. Gerçek ödeme, sipariş, para, tedarikçi siparişi ve kargo etiketi yok. Güvenlik kontrolleri kapatılmadı. Gizli değer yazılmadı.

## 7. Değişen dosyalar

Kapı, katalog SEO, arama, eski PIM, PIM30, JSON katalog, katalog senkronu, SEO servisi, içe aktarma, ilgili eklentiler, dijital beden adaptörü, yedinci tur testi ve bu rapor.
