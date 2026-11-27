# 00 — Repository baseline

Snapshot: `/home/ubuntu/buzzard-worktrees/save-full-worktree-c293`
Branch: `cursor/237-morning-status-c293`
HEAD: `73a1c64cba06c332b1174e68d6e7407ca1403bff`
Son commit: 23 Kasım 2026, 12:52 Europe/Berlin (`2026-11-23 11:52:35 +0000`)
Mesaj: Reconcile the November source counts on one commit.
Working tree bu tarama başında temizdi. Bu denetim dosyaları tarama bittikten sonra yazıldı.

İkinci worktree: `/workspace` dalı `cursor/pim-catalog-foundation-c293`, HEAD `d413d13a6b1259ccdd07ee01e60bd00c87424a80` (5 Eylül 2026). Bu eski checkout sayılara katılmadı. Aynı git deposunun ikinci kopyasıdır.

| Kontrol | Sonuç |
| --- | --- |
| Submodule | yok |
| Git LFS dosyası | yok |
| Sembolik bağ | 12, hepsi `intelligence/buzzard_ki_gesamt/aktiv/` altında |
| Monorepo | npm workspace tanımı yok. Kök Next.js uygulaması, `server/` Node API paketi ve `intelligence/` Python ağacı aynı depoda duruyor |
| İzlenen yol | 4.795 |
| İzlenmeyen bağımlılık ve build | 19.949 dosya envantere `inventory_only` olarak eklendi |

Satış kilidi bu taramada değiştirilmedi. `server/lib/salesSafetyGate.js` satışın açılmasını `BUZZARD_SALES_ENABLED` değerinin `"1"` olmasına bağlar. Bu süreçte o değişken `"1"` yapılmadı.

Sayım yöntemi: her izlenen dosya açıldı. Metin `splitlines()` ile sayıldı. Kod satırı boş ve yorum çıkarılmış satırdır. JS/TS/CSS/SQL blok yorumu `*/` kapanana kadar yorum sayılır. Python ve kabukta satır başı `#` yorumdur. JSON veri, üretim LOC değildir. SQL ve kabuk, üretim LOC dışında ayrı durur. Bu yüzden üretim kodu 200.733 satırdır. 23 Kasım raporundaki 203.355, bu sayıya SQL kodu 1.685 ve kabuk kodu 937 eklenince çıkar: 203.355.
