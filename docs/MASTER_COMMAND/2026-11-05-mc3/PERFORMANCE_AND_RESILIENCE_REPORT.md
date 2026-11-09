# Performans — yalnızca izole ölçüm

**Tarih:** 5 Kasım 2026, ~09:00 Europe/Berlin  
**Canlı üretim değil.**

| Hedef | ms | HTTP |
| --- | ---: | ---: |
| GET / | 607 | 200 |
| GET /pl/ | 523 | 200 |
| GET /products/ | 1341 | 200 |
| GET :3001/api/health | 24 | 200 |

Eşzamanlı kullanıcı / CPU / bellek profili bu turda **ölçülmedi**.  
Lab restore 15–36 ms üretim RTO değildir.
