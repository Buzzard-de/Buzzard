# İkinci tur — madde 7 ve madde 15

Tarih: 23 Kasım 2026, 06:19 Europe/Berlin.
Ağaç: `cursor/237-morning-status-c293`.
Satış kilitli (`BUZZARD_SALES_ENABLED=0`). Kod, korunan JSON, satış kilidi ve egress değişmedi.
237 maddenin numarası, görev cümlesi ve kapsamı değişmedi.

## Madde 7 — Cookie flags HttpOnly, Secure, SameSite

Görev tanımı: Session cookies not readable by JS; CSRF companion token.

Nihai durum: 🟡 Kısmen tamamlandı

### Bulunan dosyalar

- `server/lib/auth.js` satır 568–581: başarılı admin login `{ success, token, user }` döner. Set-Cookie yok.
- `server/lib/globalAuthMiddleware.js` satır 19: durum değiştiren istekte `validateCsrfForRequest` çağrılır. Çerez yazmaz.
- `server/lib/csrf.js` satır 17–21 ve 49–51: `buzzard_csrf` yalnız okunur. `generateCsrfToken` 32 bayt hex üretir, çerez set etmez. Zorlama `BUZZARD_CSRF_ENFORCE === "1"` iken.
- `lib/store/client.ts` satır 12–26 ve 58–64: hesap ve admin tokenı `sessionStorage` anahtarlarında (`buzzard_account_token`, `buzzard_admin_token`). İstek `Authorization: Bearer` ile gider.
- `server/__tests__/adminSessionHttp.test.mjs` satır 62–79.
- `server/__tests__/csrf.test.mjs`.
- `server/__tests__/aiCenterSecurity.test.mjs` satır 97–100: `set-cookie` null bekler. Bu turda koşulmadı.
- `e2e/admin-roles.spec.ts` satır 451–457: tokenın çerezde olmadığını bekler. Bu turda koşulmadı.

`js`, `mjs`, `ts`, `tsx` ve `py` dosyalarında `HttpOnly` ve `SameSite` atayan satır yok. `middleware.ts` yok. `NODE_ENV` ile Secure veya SameSite seçen çerez dalı yok.

### Çalışma mantığı

Oturum çerezi üretilmiyor. Sunucu tokenı JSON gövdesinde verir. Tarayıcı kodu onu `sessionStorage` içine yazar. `sessionStorage` JavaScript tarafından okunur. Gelen `Cookie` başlığı admin oturumu sayılmaz: test, `buzzard_admin_token` ve `token` çerezleriyle `/api/admin/me` isteğinin 401 olduğunu doğrular. Login cevabında `set-cookie` null.

Üretim ve geliştirme aynı yolu kullanır. Ayrı bir Secure koşulu yok.

CSRF eşlik çerezi bu ağaçta set edilmez. Okuyucu, istemci başlıkta `buzzard_csrf` gönderirse değeri başlıkla karşılaştırır. Varsayılan zorlama kapalıdır. Bu davranış madde 8’in konusudur; madde 7 için kanıt, eşlik çerezinin bayraklarla hiç yazılmamasıdır.

### Testler

23 Kasım 2026, 06:19 Europe/Berlin. Vitest 3.2.7. `BUZZARD_SALES_ENABLED=0`.

- `server/__tests__/csrf.test.mjs`: 4 geçti, 0 kaldı.
- `server/__tests__/adminSessionHttp.test.mjs`: 19 geçti, 0 kaldı.

CSRF testleri eşleşen ve eşleşmeyen başlığı kontrol eder. HttpOnly, Secure veya SameSite assert etmez. Admin oturum testi çerez verilmediğini ve çerezin oturum sayılmadığını doğrular. Bayrakların uygulandığını doğrulamaz.

### Entegrasyon

Auth middleware CSRF okuyucusunu kimlik kontrolünden önce çağırır. İstemci katmanı bearer ve `sessionStorage` kullanır. Çerez bayrağı üreten bir modül bu zincire bağlı değil.

### Güvenlik bulguları

- HttpOnly, Secure ve SameSite uygulanmıyor.
- Oturum tokenı `sessionStorage` içinde. Sayfa içindeki JavaScript okuyabilir.
- CSRF eşlik çerezi sunucu tarafından verilmiyor.
- Çerezin oturum olarak kabul edilmemesi test edildi. Bu, bayrakların varlığını göstermez.

### Eksik iş

Bayrakların yazılması, eşlik çerezinin set edilmesi ve bu üçünün testi yok. Koşulmayan e2e ve AI center dosyaları bu maddeyi tamamlamış saymaz.

## Madde 15 — Request validation and safe error messages

Görev tanımı: Client totals rejected; public errors do not leak internals.

Nihai durum: 🟡 Kısmen tamamlandı

Madde 7’nin testleri bu madde için kanıt sayılmadı.

### Bulunan dosyalar

- `server/lib/commerce/commerceValidation.js` satır 40–54: `subtotal`, `total`, `tax`, `shipping` veya `discount` gelirse `client_totals_rejected`.
- `server/lib/commerce/checkoutService.js` satır 122–126: red, güvenlik olayından sonra `{ error: code, status: 400 }`.
- `server/lib/security.js` satır 122–124: `publicErrorBody` yalnız `{ success: false, errorKey }`.
- `server/server.js` satır 450–475: yakalanan hata `publicErrorBody` ile cevaplanır. `error.message` sunucu loguna, en fazla 200 karakter, yazılır.
- `server/core/errors.js` satır 7–16: `publicError` cevaba `message` koyar ve `meta` yayar. `server` altındaki JavaScript dosyalarında çağıran yok.
- `server/__tests__/part8Foundation.test.mjs` satır 39–57.

### Çalışma mantığı

İstemci toplam alanlarından biri gelirse doğrulama `ok: false` döner. Checkout bu kodu 400 yapar ve istemciye doğrulama mesaj metnini değil kodu verir. `computeOrderTotals` tutarı sunucuda hesaplar.

Genel API yakalayıcısı istemciye `errorKey` gönderir. Stack ve mesaj bu gövdede yok. `publicError` helper’ı mesaj taşıyacak şekilde duruyor ve bu ağaçta bağlı değil.

### Testler

23 Kasım 2026, 06:19 Europe/Berlin. Vitest 3.2.7. `BUZZARD_SALES_ENABLED=0`.

`server/__tests__/part8Foundation.test.mjs`: 17 geçti, 0 kaldı.

İlgili iki assert:

- `rejectClientTotals({ total: 1 }).ok` false.
- `computeOrderTotals` alt toplamı 20 ve toplamı 20’den büyük.

Bu test HTTP checkout rotasını çağırmaz. `publicErrorBody` için test dosyasında eşleşme yok. Stack veya iç mesajın cevapta olmadığını assert eden test yok.

### Entegrasyon

`validateCheckout` istemci toplamını checkout durum makinesine bağlar. `sendRequestError` genel HTTP yoluna bağlıdır. İkisi ayrıdır. Birinin geçmesi diğerinin sızıntı davranışını kanıtlamaz.

### Güvenlik bulguları

- İstemci toplamı birim seviyesinde reddediliyor.
- Canlı hata yolu `errorKey` ile sınırlı görünüyor. Bu cevap yolu bu turda test edilmedi.
- `publicError` mesaj ve ek alan yayabilecek bir helper olarak duruyor. Çağıran bulunmadı. Kullanılırsa madde kapsamındaki sızıntı kuralını deler.

### Eksik iş

Checkout HTTP cevabının istemci toplamını reddettiği test yok. Genel hata gövdesinin iç veri sızdırmadığı test yok. Bu yüzden madde tamamlanmış sayılmadı.

## Sıradaki doğrulanmamış madde

Madde 16: Guest commerce proof for cart/checkout/order. Bu turda açılmadı.
