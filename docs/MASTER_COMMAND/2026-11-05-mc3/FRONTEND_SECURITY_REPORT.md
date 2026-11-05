# Frontend güvenlik

Kalan security-check uyarısı: **frontend npm audit high/critical**. Kaynak: `scripts/security-check.mjs` satır ~33–38 `npm audit --audit-level=high`. Dosya: kök `package.json` / Next/sharp/vitest.

Etki: production vitrin static export; en kritik Next Windows RCE bu Linux ortamında aynı değil. Yine de yama onayı gerekir. Uyarı kapatılmadı.

Time-trap: `_formStarted` tekrar OK.

CSP/consent: telemetry ID yoksa kapalı (önceki 4.4 testleri).

Token: sessionStorage bearer. XSS olursa okunur — CSP + browserConnect katmanı.
