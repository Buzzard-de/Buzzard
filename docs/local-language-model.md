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

Konuşma tanıma ve üretim de yereldir. Whisper small (`data/models/speech/ggml-small.bin`) ve Piper sesleri (`tr_TR-dfki-medium`, `de_DE-kerstin-low`, `en_US-lessac-medium`) Git dışındadır. Çalıştırıcılar `tools/whisper` ve `tools/piper` altındadır. Ücretli bir ses servisi gerekmez.
