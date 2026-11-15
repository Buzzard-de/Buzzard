# Pusat ve AI Kurmay

Mimari 28 Ekim 2026 korundu. Mikroservis dönüşümü yok.

| Bileşen | Kod | Çalışma | Yetki | Hafıza | Test | Canlı |
| --- | --- | --- | --- | --- | --- | --- |
| Pusat | evet | süreç içi / opsiyonel Render | koordinasyon, kasa değil | SQLite/temp | birim | LIVE değil |
| Esat | evet | in-process | izle, satış açamaz | — | birim | LIVE değil |
| Doğu | evet | desk | araştırma, ağ yok | ayrı | birim | hayır |
| Nesrin | evet | tutanak rolü | rapor | — | kısmi | hayır |
| Textile AI | iskelet | demo | rıza | — | birim | hayır |
| Tax/Customs | evet | HUMAN_REVIEW / payTax red | ödeme yok | bellek havuz | birim+drill | hayır |
| Phone | iskelet | — | — | — | BLOCKED | hayır |

Sınırsız bellek paylaşımı yok. İnsan onayı korunur.
