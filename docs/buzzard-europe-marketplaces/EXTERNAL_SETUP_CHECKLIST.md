# Dış kurulum listesi

Bu liste kodun dışında kalan işlerdir. Burada hiçbir hesap açılmadı, anahtar istenmedi ve production bağlantısı açılmadı.

Satış kilidi `BUZZARD_SALES_ENABLED=0` olarak kalır. `EUROPE_MARKETPLACE_LIVE` açılmaz. Production hostuna bilinçli olarak gidilmez.

## Her açık adaptör için hesap

1. İlgili pazaryerinde Avrupa satıcı hesabı ve sözleşme.
2. Stage ve production için ayrı anahtar. Aynı değer iki ortama yazılmaz.
3. Mirakl kayıtlarında operatorun verdiği base URL. Kod MediaMarkt veya Conrad hostu içermez.
4. Etsy uygulaması: keystring, shared secret ve shop id. Taxonomy id satıcının kendi eşlemesinden gelir.
5. Back Market: Integrations tokenı, ülke için `Accept-Language`, `BM-...` biçiminde User-Agent.
6. ManoMano: Toolbox API key ve `seller_contract_id`. Fiyat yazma yolu ayrıca resmi belgeden tamamlanmadan açılmaz.
7. Vinted Pro: allowlist, access token (`accessKey,signingKey`) ve sandbox hostu. Ürünler taslak kalır.
8. Shöpping: merchant kullanıcısı, API key ve CSV feed kanalı.
9. AlzaTrade: client id, secret ve Trade API base URL.
10. Refurbed: sandbox hostu ve Plain token. `api.refurbed.com` adaptörde kapalıdır.
11. Galaxus: merchant projesinden SFTP. REST anahtarı yoktur.

## Hesabı olup yolu henüz koda alınmayanlar

Zalando, Temu, SHEIN, TikTok Shop, Wayfair, Hood.de ve OnBuy için önce resmi endpoint listesi koda alınmalıdır. Portal adresi tek başına çağrı açmaz.

## Doğrulanmayanlar

`RESEARCH_REQUIRED` kayıtlarında resmi satıcı API yolu bu turda doğrulanmadı. Bunlar için anahtar üretmek yazılımı tamamlamaz.

`NOT_ELIGIBLE` kayıtlar kendi perakende siteleridir. Üçüncü taraf katalog satışı bu turda görülmedi.

`NO_OFFICIAL_API` kayıtlar ilan siteleridir. Katalog adaptörü için resmi API bulunamadı.

## Mevcut connector'lar

Amazon, eBay, Kaufland, Allegro, bol, Cdiscount, OTTO, eMAG ve Skroutz hesapları bu işin dışında, kendi eski sandbox kayıtlarındadır. Onların canlı hesabı da bu görevde açılmadı.

## Açılmadan önce kontrol

- Komisyon, kargo, KDV, iade rezervi ve ödeme maliyeti sayı olarak gelmeden fiyat `PRICING_NOT_VERIFIED` kalır.
- Stok 24 saatten eskiyse gönderilmez.
- Operator kategori şablonu yoksa Mirakl ürün dosyası gönderilmez.
- Sipariş veritabanına yazılmaz.
- İade etiketi ve para iadesi üretilmez.
