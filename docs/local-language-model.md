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

1.5B model kısa talimatları bazen tutar. Genel muhakeme tamamlanmış sayılmaz. Doğrulama geçmeyen çıktı `LOCAL_MODEL` değildir.
