# 03 — Dosya türü istatistikleri

Tek kategori. Bir dosya bir kez sayılır.

| Kategori | Dosya | Bayt | Fiziksel satır | Kod | Yorum | Boş |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| production_source | 2.293 | 10.946.990 | 223.792 | 200.733 | 3.159 | 19.900 |
| test | 307 | 1.406.963 | 31.828 | 28.112 | 297 | 3.419 |
| script | 24 | 54.407 | 1.144 | 937 | 132 | 75 |
| sql | 2 | 595.744 | 1.703 | 1.685 | 14 | 4 |
| documentation | 845 | 11.232.399 | 160.600 | 138.961 | 0 | 21.639 |
| configuration | 39 | 334.508 | 9.761 | 9.629 | 24 | 108 |
| data | 274 | 46.623.493 | 1.281.038 | 1.281.038 | 0 | 0 |
| generated | 5 | 207.501 | 6.678 | 6.668 | 9 | 1 |
| packaged_copy | 198 | 968.383 | 28.554 | 23.488 | 176 | 4.890 |
| image | 98 | 16.113.364 | 0 | 0 | 0 | 0 |
| audio | 1 | 401.218 | 0 | 0 | 0 | 0 |
| video | 0 | 0 | 0 | 0 | 0 | 0 |
| archive | 274 | 27.736.135 | 0 | 0 | 0 | 0 |
| database | 0 | 0 | 0 | 0 | 0 | 0 |
| ai_model | 0 | 0 | 0 | 0 | 0 | 0 |
| font | 0 | 0 | 0 | 0 | 0 | 0 |
| binary | 0 | 0 | 0 | 0 | 0 | 0 |
| pdf | 0 | 0 | 0 | 0 | 0 | 0 |
| symlink | 12 | 0 | 0 | 0 | 0 | 0 |
| empty | 388 | 0 | 0 | 0 | 0 | 0 |
| other | 35 | 1.466.218 | 27.066 | 26.530 | 0 | 536 |
| missing | 0 | 0 | 0 | 0 | 0 | 0 |
| **İzlenen toplam** | **4.795** | **118.087.323** | **1.772.164** | **1.717.781** | **3.811** | **50.572** |

Bağımlılık ve build, izlenen toplama dahil değildir.

| Ağaç | Dosya | Boyut | İnceleme |
| --- | ---: | ---: | --- |
| `node_modules/` | 19.311 | 611.789.663 bayt (583 MB) | envanter. Üçüncü parti kaynak okunmadı |
| `server/node_modules/` | 552 | 15.099.757 bayt | envanter |
| `.next/` | 82 | 114.915.467 bayt | build çıktısı |
| `scripts/__pycache__/` | 3 | 124.248 bayt | önbellek |
| `server/data/` | 1 | 1.744.896 bayt | yerel SQLite, izlenmiyor |

İnceleme durumu, izlenen dosyalar:

- İçeriği tarandı: 4.022
- Metadata (görsel, ses, arşiv, font): 384
- Kısmen: 0
- Okunamadı: 1
- Boş: 388

OCR aracı yok. Görsellerde `file` metadata kullanıldı. Ses için ffprobe kullanıldı. Arşivler diske açılmadan üye listesiyle okundu.
