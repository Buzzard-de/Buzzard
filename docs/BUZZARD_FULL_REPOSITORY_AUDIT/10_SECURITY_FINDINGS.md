# 10 — Güvenlik bulguları

Değerler yazılmadı.

Özel anahtar bloğu ve `AKIA` erişim anahtarı deseni izlenen kaynakta çıkmadı.

Atama deseni 62 kayıt verdi. Gözden geçirme, değerin kendisini basmadan yapıldı.

- `lib/i18n/locales/*.ts`: `password` anahtarı çeviri metnidir. Kimlik bilgisi değildir.

- `scripts/part2` … `part7` ve `server/__tests__`: test veya duman senaryosu sabitleri. Canlı sağlayıcı anahtarı olarak doğrulanmadı.

- `server/lib/supplier/supplierRedact.js` ve `baseAdapter.js`: alan adı `apiKey` / `token`. Redaksiyon ve adaptör kodu.

- `server/lib/security/phase17Evidence.js` ve `server/lib/logistics/phase8Evidence.js`: kanıt modülünde sabit atama. Dış servis anahtarı olduğu gösterilmedi.


Satış kilidi, ödeme `PAYMENT_NOT_LIVE` ve tedarikçi `LIVE_ORDER_FORBIDDEN` bu turda çalışan dört test dosyasında doğrulandı.

TODO/FIXME/XXX taraması izlenen metinde TODO 2, FIXME 2, XXX 2 eşleşme verdi. XXX eşleşmelerinden biri para birimi kodu `XXX` testidir. Yorum tabanlı borç seyrektir.

IDOR için bütün route'lar elden incelenmedi. Route metinleri CSV'dedir. Bu turda IDOR açığı kanıtı üretilmedi.

