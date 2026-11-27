# Yerel dil modeli

Buzzard, Qwen2.5-1.5B-Instruct Q4_K_M ağırlığını Git dışında çalıştırır. Lisans Apache-2.0. Ücretli bir AI API’si gerekmez.

Kalıcı dosya:

`data/models/language/qwen2.5-1.5b-instruct-q4_k_m.gguf`

SHA-256:

`6a1a2eb6d15622bf3c96857206351ba97e1af16c30d7a74ee38970e434e9407e`

Boyut: 1117320736 bayt.

Çalıştırıcı llama.cpp b12755, MIT. İkili dosya `tools/llama/llama-cli` altında kalır ve depoya girmez. GPU katmanı 0’dır.

Temiz kurulum, depo kökünden:

```bash
node -e "console.log(require('./server/lib/buzzardNative/thinking/localLanguageModel').installLocalLanguageModel())"
```

Kurulum, dosya yoksa veya SHA-256 tutmuyorsa ağırlığı yeniden indirir. Dosya doğruysa yeniden indirmez. Çalıştırıcı yoksa aynı fonksiyon llama.cpp arşivini indirir.

Runtime, `BUZZARD_GGUF_PATH` veya `data/models/language/` içindeki GGUF dosyasını kendisi arar. `BUZZARD_LLAMA_BIN` çalıştırıcı yolunu değiştirir.

1.5B model kısa talimatları bazen tutar. Aynı dizindeki Qwen2.5-3B-Instruct Q4_K_M dosyası varsa runtime onu seçer. Lisansı Apache-2.0, boyutu 2104932768 bayt, SHA-256 `626b4a6678b86442240e33df819e00132d3ba7dddfe1cdc4fbb18e0a9615c62d`. Doğrulama geçmeyen çıktı `LOCAL_MODEL` değildir.

Konuşma tanıma ve üretim de yereldir. Whisper small (`data/models/speech/ggml-small.bin`) ve Piper sesleri Git dışındadır. Çalıştırıcılar `tools/whisper` ve `tools/piper` altındadır. Ücretli bir ses servisi gerekmez.

Bu makinede 4 CPU, NVIDIA GPU yok, yaklaşık 16 GiB bellek ve takas alanı yok. 3B model bu sınırda çalıştığı için 7B indirilmedi. On iki konuşmacının profil dosyası ayrıdır. Türkçe ürün sesi yalnızca `tr_TR-antalia-medium.onnx`: CC-BY-4.0, kaynak `ozgurguler/piper-tr-antalia-medium`, veri `cloud0day3/antalia-voice-corpus`. Sentetik tek kadın konuşmacıdır; kurul üyesi değildir ve Sinan Bey kaydıyla eğitilmemiştir. Eski Piper ikilisi çok kodlu fonemde durur. Bu dosyayı yerel `piper-tts` 1.8.0 (GPL-3.0) okur. `tr_TR-dfki-medium` CC-BY-NC-SA-4.0 olduğu için ürün sesi değildir. Diğer dillerin kartında lisans yazmıyorsa alan `NOT_IN_MODEL_CARD` kalır. Sinan Bey’in `m4a` referansı senteze karışmaz. Türkçe toplantı cümlesi paylaşılan Antalia ürün sesiyle okunur. Bu ses hiçbir üyenin kişisel modeli değildir. Kişisel dosya `data/models/speech/members/<uye>.onnx` yolunda aranır; dosya yoksa kayıt `BLOCKED_ASSET` kalır. Canora elif ve emre Apache-2.0 tasarım sesleridir, katalogdadır ve bir üyeye atanmaz. Cem deposu kimlik ister, bu yüzden indirilmedi. dfki ticari kullanıma kapalıdır. Ağır yerel süreçler aynı anda bir kez çalışır. coturn yalnızca yerel TURN denemesidir. FreeSWITCH paketi bu ortamda yoktur; hazır profil çalışmıyor. Operatör hattı yoktur.

Pusat’ın doğrulaması test dosyasına özel değildir. `convene` mevcut orkestratörden geçer: konu sınıflanır, uzman motorları çalışır, cevap motor değeriyle karşılaştırılır, reddedilen metin toplantı kaydına yazılır ve yerine motor cümlesi konur. Kaynak yoksa cevap `UNVERIFIED` kalır.

Whisper transkripti sözlükle değiştirilmez. İsim ve terim ipucu yalnızca `--prompt` olarak verilir. Tanınmayan kelime sessizce düzeltilmez.

Yerel WebRTC oturumunda `dtls` yalnızca iki tarafın bağlantı durumu `connected` ise, `srtp` yalnızca çözülen paket aynı oturumdaki gönderilen baytlarla eşleşirse doğrudur. `secure` ikisi birden varsa açılır. Bu oturum `LOOPBACK`’tir. STUN adayı toplamak internet görüşmesi değildir. coturn kurulu değildir. Ücretli TURN zorunlu değildir. SIP laboratuvar çağrısında RTP vardır, SRTP yoktur, `secure` kapalıdır. Operatörden gelen veya giden arama yoktur. Kendi sunucuda değerlendirilen açık aday FreeSWITCH’tir; kurulu değildir.

27 Kasım 2026 devamı: coturn bu makinede kurulu ve yerel relay adayı alındı. Bu internet görüşmesi değildir. Düz SIP laboratuvarı RTP olarak durur. Ayrı bir laboratuvar çağrısı RFC 3711 AES-CM ve HMAC-SHA1-80 ile SRTP şifreler, doğru paketi çözer ve bozulmuş paketi reddeder. Anahtar laboratuvar vektörüdür. Sinyalleşme TLS değildir. Operatör hattı ve FreeSWITCH yoktur.

27 Kasım 2026 ikinci devam: düz SIP çağrısı ve SRTP laboratuvarı aynı kaldı. Ayrı bir yerel çağrı sinyali TLS üzerinden taşır. Sertifika geçici ve kendinden imzalıdır. Sertifikasız istemci reddedilir. Bu operatör hattı değildir ve medya SRTP sayılmaz.

27 Kasım 2026 üçüncü devam: düz SIP, SRTP ve TLS laboratuvarları aynı kaldı. Ayrı bir yerel REGISTER özet kimlik sorar. Doğru laboratuvar parolası kaydı açar. Yanlış parola, kullanılmış nonce ve sunucunun vermediği nonce reddedilir. Bu operatör hesabı değildir ve medya yoktur.

Avatar önizlemesi ses genliğine bağlı authored mesh’tir ve gerçek karakter değildir. Üye `.gltf` veya `.glb` dosyası `data/models/avatars/` altında yoksa durum `BLOCKED_ASSET`. Yüklenen dosya da fotogerçekçi yüz veya taranmış beden sayılmaz. İnternet WebRTC görüşmesi iki ayrı uç gerektirir. coturn paketi kurulu değilse durum `BLOCKED_EXTERNAL` kalır. SIP laboratuvarı operatör hattı değildir.
