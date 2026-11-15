# Cursor sürekli bakım SOP (Madde 14)

**Durum:** CODE_READY (doküman). Cursor 7/24 kendi başına çalışmaz.  
**Push / merge / deploy:** yalnızca Süleyman Bey açık onayı.

1. İzole dal: `cursor/<konu>-c293`. Egress 4.4 dalını ezme.  
2. Mevcut vitrin/taxonomy’yi gereksiz yeniden yazma.  
3. Her değişiklik: birim + ilgili güvenlik testi.  
4. Secret’ı argv veya commite koyma.  
5. Allowlist, satış, Stripe/PayPal, vergi ödemesi, production restore yasak (ayrı onay).  
6. COMPLETE ancak LIVE_VERIFIED kanıtı varsa.  
7. Rapor `docs/MASTER_COMMAND/` altına; mevcut SPECIAL_16 raporlarını silme.  
8. İş bitince dur; push için ayrı onay bekle.
