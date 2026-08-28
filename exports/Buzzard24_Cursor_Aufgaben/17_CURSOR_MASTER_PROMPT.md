# CURSOR MASTER PROMPT

Buzzard24 projesini bu klasördeki P0/P1 görevlerine göre tamamla.

Önce mevcut repository, PR #238 ve mevcut Orchestrator kodunu incele. Mevcut çalışan sistemi koru; aynı işlev için duplicate servis oluşturma. Yeni merkezi Görev Orkestratörü yapısını mevcut Orchestrator ile konsolide et.

KIRMIZI SINIRLAR:
- Online satış KESİNLİKLE kapalı.
- `SALES_ENABLED=false`.
- Checkout/payment açılmayacak.
- Stripe/PayPal aktive edilmeyecek.
- Gerçek tedarikçi siparişi gönderilmeyecek.
- Gerçek ödeme yapılmayacak.
- Echte Produktbilder werden in dieser Phase NICHT hinzugefügt.
- Placeholderbilder bleiben.
- Secrets repo'ya yazılmayacak.

Çalışma:
1. Mevcut kodu incele.
2. P0 görevlerini yap.
3. Her değişiklikten sonra build/test çalıştır.
4. Hataları düzelt.
5. P1 görevlerini sırayla tamamla.
6. Küçük, geri alınabilir commitler yap.
7. Sonunda değişen dosyalar + test sonuçları + kalan işler raporla.

HEDEF:
Buzzard24 katalog modu, admin, güvenlik, AI Orchestrator, AI agent yönetimi, kategori/ürün altyapısı, supplier adapter altyapısı, fiyat/stok hazırlığı, gümrük AI altyapısı, i18n, SEO ve QA açısından sağlam bir temel olsun.

SATIŞ AKTİVASYONU BU PAKETİN KAPSAMI DIŞINDADIR.
