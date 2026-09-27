# Pusat AI Runtime

Bu paket, Pusat'ın canlı telefon görüşmesi + AI Orchestrator + uzman AI'lar + ortak işlem bağlamı + exception/human approval çekirdeği için üretim entegrasyonunun temel kod katmanıdır.

## Çalıştırma

```bash
npm install
npm run typecheck
npm test
npm run build
```

## Önemli

Bu paket mevcut Pusat repository'sinin kaynak kodu görülmeden oluşturulmuş bağımsız bir runtime/integration foundation'dır. Production'da SQLite/Redis/queue/telephony/gerçek AI provider adaptörleri mevcut Pusat altyapısına bağlanmalıdır.

Gerçek ödeme, gerçek iade, gerçek tedarikçi siparişi, gerçek marketplace siparişi veya gerçek kargo işlemi bu pakette otomatik olarak aktif edilmemiştir.

## Ana prensip

Voice AI müşteriyle canlı kalır; uzman AI'lar Orchestrator üzerinden yapılandırılmış görevlerle arka planda çalışır. Kritik yan etkiler policy + approval olmadan uygulanmaz.
