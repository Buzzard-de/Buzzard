# Sekizinci tur — 23 Kasım 2026, 11:51 Europe/Berlin

Önceki yedi turun kayıtlarına dokunulmadı. Başlangıç commit `41bcf5ac`. Satış kilidi kapalı.

## 1. Mimari

Tek motor `digital_body`. Oturum, profil ve sağlayıcı sözleşmesi `server/lib/buzzardNative/engines/digitalBodySession.js`. Karakterler aynı motoru kullanır. Her birinin avatarı, ses kimliği, kişiliği, davranışı ve görevi ayrıdır.

Profiller: Sinan (`sinan_bey`), Esat Bey, Doğu Bey, Mira, Leon, Amelia, Adrian. Ses kimlikleri birbirinden farklıdır.

## 2. Gerçek çalışan

- Profil ayrımı ve ses kimliği eşlemesi.
- Oturum açma, kesme, yeniden başlatma.
- Yetkisiz profil değişikliğinin reddi. Pusat ancak `PROFILE_CHANGE` onayıyla profil değiştirir; yeni profil kendi ses kimliğini alır.
- Sağlayıcı hatası oturumu düşürmez (`PROVIDER_FAULT`, `sessionAlive: true`).
- Dil yuvası: `tr`, `de`, `en`, `ar`. Yuvada olmayan dil reddedilir.
- Pusat bir konuşma turunu yönlendirir. `spoke: false`.

## 3. Kodlandı, sağlayıcı bekliyor

STT, TTS, gerçek zamanlı ses, dudak, yüz, göz ve baş, kol, gövde, yürüme, oturma, nesne ve kıyafet. Hepsi `PROVIDER_ABSENT`. Ses baytı 0. Çizim yok. CSS beden sayılmaz.

## 4. Sinan sesi

Kimlik `sinan_bey_official_voice_v1` duruyor. Referans dosyası bu ağaçta var (`filePresent: true`, kod `REFERENCE_REGISTERED`). `ttsReady: false`, `ready: false`, `naturalSpeech: false`. Ses hazır değil. Diğer karakterlerin referans dosyası yok (`VOICE_REFERENCE_ABSENT`).

## 5. 237 madde

Yeni doğrulanan madde yok. Sayılar yedinci turdaki gibi:

- Doğrulanan: 24
- Kısmi: 208
- Uygulanmayan: 0
- Dış hesap: 1 (madde 88, TecDoc, hesap doğrulanmadı)
- Doğrulanamayan: 4

200 diğer dal manifestoları açılmadı. 205 `gh pr checks 515` kontrol döndürmedi. 220 Render diski yok. 221 DNS denetlenmedi.

## 6. Test

`itemsEighthPass.test.mjs` 6/6. `itemsSeventhPass` 4/4 ve `itemsSixthPass` 3/3 geçti. Ödeme `PAYMENT_NOT_LIVE`. Tedarikçi `LIVE_ORDER_FORBIDDEN`. Satış kapalı.

## 7. Değişen dosyalar

`digitalBodySession.js`, `digitalHumanAdapter.js` (profiller oturum kaydından), `itemsEighthPass.test.mjs`, bu rapor.
