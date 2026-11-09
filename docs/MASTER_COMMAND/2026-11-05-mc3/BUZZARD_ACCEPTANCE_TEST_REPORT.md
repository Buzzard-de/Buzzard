# Kabul — Command 3

**Zaman:** 5 Kasım 2026, ~08:35 Europe/Berlin

| Komut | Sonuç |
| --- | --- |
| test:master-ecosystem | **81/81** |
| Python egress | **6/6** |
| Isolated restore | OK, 11 ms, productionTouched false |
| Playwright (request+Chromium) | **8/8** |
| lint | geçti |
| tsc | geçti |
| security-check | 1 uyarı (npm frontend) |
| npm audit | 16 açık; force yok |
| Tam admin/RTL viewport paketi | kısmi (2 Chromium senaryo) |
| Production restore | yapılmadı |

Performans: lab restore 11 ms. API latency / canlı p95 **ölçülmedi**.
