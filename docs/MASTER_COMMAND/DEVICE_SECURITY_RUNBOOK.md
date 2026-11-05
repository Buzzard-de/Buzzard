# Cihaz güvenlik runbook (Madde 11)

Kod: `server/lib/security/deviceStandard.js` — `completeClaim` her zaman false.  
Bu runbook operatör içindir. Canlı cihaz attestasyonu **BLOCKED**.

## Windows tabanı
- BitLocker + TPM + Secure Boot.  
- PIN/parola + MFA + mümkünse donanım anahtarı.  
- Windows Hello cihaz donanımına bağlıdır; iris her cihazda yok.  
- Ses tek başına kimlik değildir.  
- Recovery key **offline**, yedeklerle aynı kasada değil.

## Kayıp cihaz
1. Oturumları iptal et.  
2. Kimlik bilgilerini yenile.  
3. Uzaktan kilitle.  
4. Gerekirse uzaktan sil (yanlış pozitif koruması: çift onay).  
5. Recovery key ile yeni cihaz.  
Hedef: kriptografik erişilemezlik. Fiziksel imha prosedürü yok.

`evaluateDevice` COMPLETE iddia etmez.
