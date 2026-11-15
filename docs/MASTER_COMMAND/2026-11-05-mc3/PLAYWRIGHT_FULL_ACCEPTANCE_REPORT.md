# Playwright kabul

**Tarih:** 5 Kasım 2026, ~09:02 Europe/Berlin  
**Ortam:** localhost:3000 + :3001, Chromium kuruldu  
**Sonuç:** 14/14 bu tur (önceki 8/8 silinmedi, genişletildi)

| Senaryo | Sonuç | Sınır |
| --- | --- | --- |
| Health / satış kapalı | geçti | yerel API |
| Retired slug anasayfa yok | geçti | |
| 30 locale `/xx/` <500 | geçti | landing; her alt sayfa değil |
| Cart / products / login / admin login | geçti | gerçek hesap yok |
| Mobil 375 + `/ar/` | geçti | tam RTL piksel denetimi yok |
| Chromium desktop + mobile project | geçti | |

Eksik: her locale menü çevirisi görsel QA, tam admin RBAC tıklama, gerçek sipariş (yasak).
