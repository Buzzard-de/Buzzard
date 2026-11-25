# Kategori eşlemesi

25 Kasım 2026, 07:38 Europe/Berlin.

Merkez `server/lib/marketplace/europe/categoryInventory.js`. Mevcut connector dosyalarına ve Trendyol adaptörüne dokunulmadı.

Akış:

`Buzzard kategorisi → pazar yeri kaydı → pazar yeri kategori kimliği → özellikler → ilan kuralı`

Buzzard kodları `buzzardNative` kategori motorundaki 50’lik ana ağaçtan okunur. Emekli kodlar `bz.20`, `bz.25` ve `bz.26` reddedilir.

## Kurallar

- Her platformun tek canonical kaydı vardır. `Amazon Automotive`, `OTTO Fashion`, `Zalando Beauty` ayrı platform değildir.
- Bir kayıt birden fazla kategori grubuna bağlanabilir.
- Ülke, dil, para birimi ve bölge ayrı alanlardır. İsviçre `de/fr/it` ve bölge `CH`. Birleşik Krallık `GBP`, dil `en`, bölge `GB`.
- Türler ayrıdır: `marketplace`, `retailer`, `classified`, `comparison`.
- Karşılaştırma ve ilan kanallarında `productApi` ve `orderApi` false kalır.
- Pazaryeri olduğu doğrulanmayan kayıt `API_NOT_VERIFIED` döner.
- Perakendeci ve `NOT_ELIGIBLE` kayıt `RETAILER_NOT_A_MARKETPLACE` döner.
- Pazar yerinin gerçek kategori ağacı bu turda indirilmedi. `marketplaceCategoryId` boşsa yayın `MARKETPLACE_CATEGORY_UNMAPPED` ile durur.
- Özellik kimlikleri uydurulmaz. `marketplaceAttributesConfirmed` true değilse `MARKETPLACE_ATTRIBUTES_UNCONFIRMED`.
- Kategori bulunamazsa veya emekliyse yayın yok.
- Bütün tamamlanmış planlar da `publish: false`, `live: false`, kod `LIVE_PUBLISH_CLOSED`.
- Douglas giyim grubuna alınmadı. Kozmetik notu nedeniyle `bz.21` ve `bz.22`.
- Back Market ve Refurbed gibi yalnız recommerce kayıtlarında `used` veya `refurbished` koşulu zorunludur.

## Buzzard kodları

| Grup | Kodlar |
| --- | --- |
| Otomotiv | bz.01 |
| Elektronik | bz.12, bz.13, bz.14 |
| Moda | bz.17, bz.18, bz.19 |
| Ev ve mobilya | bz.05, bz.06, bz.07, bz.08, bz.09 |
| Yapı, bahçe, alet | bz.02, bz.03, bz.04 |
| Spor | bz.30, bz.31, bz.49 |
| Kitap ve medya | bz.34 |
| Evcil hayvan | bz.36, bz.51 |
| Kozmetik | bz.21, bz.22 |
| Müzik | bz.33 |
| Sanayi | bz.38, bz.39 |

Genel pazaryerleri bu kodların tamamına adaydır. Aday olmak yayın değildir.

## Test

07:38 Europe/Berlin, `server/__tests__/europeCategoryInventory.test.mjs` 4/4 geçti. Aynı çalıştırmada Avrupa adaptör dosyası 10/10 geçti.

Kanıt: envanterdeki her ad tek kayda çözülür. Amazon ve Amazon Automotive aynı kayıttır. `bz.20` emekli, `bz.99` yoktur. Kategori kimliği yokken yayın kapalıdır. Daparto giyimi reddeder. Idealo karşılaştırma, Kleinanzeigen ilan, Coolblue perakendeci, Autodoc doğrulanmamış API olarak kapanır. Hayvan ürünü `bz.01` rotasına girmez.
