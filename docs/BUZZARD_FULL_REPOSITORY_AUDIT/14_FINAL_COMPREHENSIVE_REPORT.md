# 14 — Sonuç

1. İzlenen dosya 4.795. Buna ek olarak bağımlılık ve build 19.949 dosya. İkisi birlikte 24.744 yol. `.git` yürünmedi.

2. İzlenen dosyaların 4.022 tanesinin metni tarandı. 384 dosyada metadata veya arşiv listesi alındı. Boş dosya 388.

3. Zip sanılıp açılamayan tek dosya `work-tree.tgz` oldu. Tar olarak 5.403 üye adı okundu. OCR yapılmadı. Üçüncü parti `node_modules` yorumlanmadı.

4. Üretim LOC 200.733. SQL ve kabuk hariç. Onlar eklenince 203.355 olur.

5. Test LOC 28.112.

6. İzlenen metnin fiziksel satırı 1.772.164.

7. Diller: JavaScript, TypeScript, TSX, Python, CSS, HTML, SQL, Shell, JSON, YAML, Markdown. Java, Kotlin, Swift, C, C++, C#, Go, Rust, PHP, Ruby dosyası çıkmadı.

8. Çalışan tek bir süreç sayısı ölçülmedi. Kaynakta ayrı duran alanlar: frontend, backend, ürün, stok, fiyat, sipariş, ödeme, tedarikçi, Pusat, dijital beden, intelligence, güvenlik, CI.

9. Bağlantı kanıtı import sütununda ve route eşleşmelerindedir. Ortak yazılım kapısı ödeme, tedarikçi ve katalog yazımlarında testlerle görüldü.

10. Ödeme canlı değil. Tedarikçi canlı sipariş kapalı. Dijital beden ses üretimi kapalı. Bunlar çalışan servis değil, kapalı kapıdır.

11. Kullanılmayan dosya listesi üretilmedi. Statik graf tam çözülmedi.

12. Aynı içerikli 181 grup var. Ayrıntı 11. rapordadır.

13. En büyük dosya `work-tree.tgz` (16.649.830 bayt). Sonra taşıyıcı JSON sürümleri ve `public/council/sinan-bey.png`.

14. En uzun üretim dosyaları 07. rapordadır. Listenin başında intelligence HTML ve büyük Python dosyaları vardır.

15. Bu turda 4 test dosyası çalıştı. Kalan yüzlerce test dosyası çalıştırılmadı. Onların sonucu yok.

16. Canlı anahtar sızıntısı kanıtlanmadı. Ayrıntı 10. rapordadır.

17. Kök ve `server/package.json` bağımlılıkları 08. rapordadır. `node_modules` 19.311 dosyadır.

18. Depo büyük bir uygulama ağacı, bir Python intelligence kopya ormanı, veri JSON'u ve kapalı ticaret kapılarından oluşur. Satış kilidi bu turda açılmadı.

