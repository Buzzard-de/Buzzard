# RPO / RTO değerlendirmesi

Hedefler öneridir. Canlı ölçüm **yok**.

| Sistem | Hedef RPO | Hedef RTO | Ölçülen |
| --- | --- | --- | --- |
| Veritabanı | 15 dk | 30 dk | lab 15–36 ms |
| Sipariş | 15 dk | 30 dk | lab sentetik |
| Stok | 15 dk | 30 dk | lab sentetik |
| Katalog | 1 sa | 30 dk | ölçülmedi (prod) |
| Müşteri | 15 dk | 30 dk | lab |
| Ödeme kayıtları | 15 dk | 1 sa | satış kapalı |
| Vergi havuzları | bellek — kalıcı değil | n/a | süreç içi |
| Pusat | 1 sa | 1 sa | lab satır |
| AI hafıza | 1 sa | 1 sa | lab satır |
| Güvenlik log | 15 dk | 1 sa | ring + git |

11/15/36 ms değerleri **üretim RTO değildir**.
