# Dokuzuncu tur — 23 Kasım 2026, 12:21 Europe/Berlin

Önceki sekiz turun kayıtlarına dokunulmadı. Başlangıç commit `602a4c6d`. Satış kilidi kapalı. `ttsReady` false. Gerçek konuşma üretilmedi.

## 1. Sinan ses referansı

Dosya duruyor: `public/council/sinan-bey-official-voice-v1.m4a`. Kimlik `sinan_bey_official_voice_v1`. Kayıtlı özetle aynı. Test dosyayı değiştirmedi.

ffprobe: AAC, 48 kHz, stereo, süre 20 saniyenin üstünde, 401218 bayt. Konteyner açılıyor. Bu, referans kaydın okunmasıdır. Sentez değildir.

`cloneAuthorized: false`. Klon lisansı yok. Referans başka karaktere verilmedi.

## 2. TTS

Bu makinede espeak, piper veya Coqui çalıştırılmadı. Ücretli API eklenmedi. Anahtar yazılmadı.

Sinan için sentez `CLONE_DENIED`, 0 bayt, `ttsReady: false`, `officialVoiceUsed: false`. Lisans gelmeden açık kaynak bir klon modeli de kurulmadı.

Esat Bey, Doğu Bey, Mira, Leon, Amelia ve Adrian: `VOICE_REFERENCE_ABSENT`. Ses kimlikleri Sinan'ın kimliği değil.

## 3. STT

Boş ses `EMPTY_AUDIO`. Süre aşımı `STT_TIMEOUT`. Türkçe, Almanca, İngilizce ve Arapça yuvası var; dördünde de metin yok, `sttReady: false`, kayıt saklanmıyor. Tanınmayan dil reddedilir.

## 4. Pusat

Akış adımları: capture, stt, select, tts. Sinan turunda TTS kodu `CLONE_DENIED`. `spoke: false`. Ses baytı üretilmeden konuştu denmez.

## 5. Animasyon

Dudak, yüz, göz, kol, gövde, yürüme, oturma, nesne ve kıyafet `PROVIDER_ABSENT`. Çizim yok.

## 6. 237 madde

Yeni doğrulanan madde yok.

- Doğrulanan: 24
- Kısmi: 208
- Uygulanmayan: 0
- Dış hesap: 1 (madde 88, TecDoc)
- Doğrulanamayan: 4 (200, 205, 220, 221)

Bu turda diğer dal manifestoları, CI kaydı, Render diski ve DNS yeniden açılmadı.

## 7. Test

`itemsNinthPass.test.mjs` 5/5. Sekizinci tur 6/6 ve yedinci tur 4/4 geçti. Ödeme `PAYMENT_NOT_LIVE`. Tedarikçi `LIVE_ORDER_FORBIDDEN`.

## 8. Değişen dosyalar

`ttsGate.js`, `sttGate.js`, `digitalBodySession.js`, sekizinci turdaki konuşma kodu beklentisi, `itemsNinthPass.test.mjs`, bu rapor.
