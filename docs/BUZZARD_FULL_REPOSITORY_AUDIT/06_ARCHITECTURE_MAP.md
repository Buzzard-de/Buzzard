# 06 — Mimari harita

Harita, dizin ve import kanıtına dayanır. Bir klasörün varlığı o motorun canlı ödeme veya canlı sipariş yaptığı anlamına gelmez.

| Alan | Kanıt | Durum |
| --- | --- | --- |
| Frontend | `app/`, `components/`, `styles/`, `lib/` | Next.js arayüzü. Sayfalar ve bileşenler kaynak olarak duruyor. |
| Backend | `server/server.js`, `server/lib/`, `server/plugins/` | Node API. Route taramasında kaynak dosyalarda 1.908 `.get/.post/.put/.patch/.delete/.route` eşleşmesi var. Bunun bir kısmı yama dosyalarındaki metindir, çalışan sunucu kaydı değildir. |
| Database | `better-sqlite3` bağımlılığı, `server/data/` izlenmeyen SQLite | Yerel dosya veritabanı. Bu taramada yazılmadı. |
| Authentication / RBAC | `server/lib/security`, admin testleri | Kapı ve rol testleri var. Canlı kimlik sağlayıcı bu taramada çağrılmadı. |
| Product | `server/lib/pim`, product servisleri | Kanonik ürün yazımı ortak yazılım kapısına bağlı. |
| Inventory / Pricing | yolunda inventory veya pricing geçen modüller | Kod var. Ayrı canlı stok servisi bu taramada çalıştırılmadı. |
| Order / Payment | `server/lib/commerce` | Ödeme yakalama `PAYMENT_NOT_LIVE` ile kapalı kalacak şekilde test edildi. |
| Supplier | `server/lib/supplier`, `server/lib/adapters` | `placeOrder` testi `LIVE_ORDER_FORBIDDEN` döndü. |
| Pusat | `server/lib/pusat`, 20 dosya | Orkestratör kodu duruyor. |
| Digital human | 29 dosya, `digitalBody`, speech, hearing | Ses üretimi kapalı. Referans m4a 24,04 saniye, 401.218 bayt. Konuşma içeriği çözülmedi. |
| AI / intelligence | `intelligence/`, 1.717 dosya | Python ağaçları ve arşiv kopyaları. Hepsi çalışan servis değildir. |
| CI | `.github/`, 9 dosya | İş akışı dosyaları var. Bu turda CI çalıştırılmadı. |
| Sales | `server/lib/salesSafetyGate.js` | Kilit değiştirilmedi. |

Modül dosya sayıları, ilk eşleşen kurala göredir. Toplamları 4.795'tir.

| Modül | Dosya |
| --- | ---: |
| intelligence | 1.717 |
| frontend | 953 |
| docs | 698 |
| root | 474 |
| backend | 324 |
| order | 162 |
| supplier | 134 |
| scripts | 90 |
| product | 62 |
| payment | 36 |
| security | 36 |
| inventory | 32 |
| digital_human | 29 |
| pusat | 20 |
| pricing | 19 |
| ci | 9 |
