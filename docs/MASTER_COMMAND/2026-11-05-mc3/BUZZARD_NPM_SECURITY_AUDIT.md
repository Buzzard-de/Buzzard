# npm güvenlik denetimi — Command 3

**Zaman:** 5 Kasım 2026, Europe/Berlin  
**Komut:** `npm audit` (kök). Server: 0 açık.  
**`npm audit fix --force` çalıştırılmadı.**

## Özet

16 kök-raporlanan açık: **3 critical, 6 high, 7 moderate**.

| Paket | Seviye | GHSA (örnek) | Kullanım | Düzeltme | Breaking |
| --- | --- | --- | --- | --- | --- |
| next | critical | GHSA-p293-qw3h-jr36 (Windows RCE), image RCE, cache poison | vitrin/export | resmi Next yama | **Evet — NEEDS_APPROVAL** |
| tinypool / vitest | critical | GHSA-5gmw-xhrv-c9v3 | yalnızca test | vitest 5 force | **Evet — yapılmadı** |
| sharp | high | libvips/libheif | Next image (unoptimized) | sharp yükselt | Next ile bağlı |
| postcss / source-map-js | high | XSS / file read / DoS | build | Next bağımlı | dolaylı |
| js-yaml | high | GHSA-2883-xcg3-v3hh DoS | toolchain | patch mümkün olabilir | incelenmedi (lockfile rastgele yenilenmedi) |
| brace-expansion / minimatch | high/mod | DoS | eslint | `npm audit fix` | eslint ağacı |
| vite / @vitest/mocker | high/mod | dev server / test | dev+test | force vitest | breaking |

## Gerçek etki (dürüst)

- Next Windows RCE: bu Linux/Render ortamında **doğrudan aynı exploit yolu yok**; yine de yama onayı gerekir.
- Image optimizer RCE: `images.unoptimized: true` + static export riski düşürür; LIVE_VERIFIED yama değil.
- Vitest/tinypool RCE: production vitrin yolunda değil; CI/dev riski.
- Force upgrade yapılmadı çünkü Next/Vitest major/kırıcı.

## Security-check

- Time-trap: **düzeltildi** (`_formStarted` alanı).
- Kalan 1 uyarı: frontend high/critical audit — **kapatılmadı**, gerçek.
