# Buzzard24 — Was noch zu tun ist

**Stand:** 27. Aug 2026 · Katalogmodus · Verkauf bleibt aus

---

## ✅ Bereits erledigt (Code + Live)

| Bereich | Status |
|---------|--------|
| Website [buzzard24.de](https://buzzard24.de) | Live |
| E-Mail `info@buzzard24.de` (IONOS) | Funktioniert |
| Telefon `+49 151 26219394` | Auf Website |
| Kontaktformular (FormSubmit) | Aktiv |
| Newsletter (FormSubmit) | Aktiv nach Deploy |
| Render API `buzzard-api` | Live — `salesEnabled: false` |
| Rechtliche Seiten | Katalog-Texte (AGB, Hilfe, Versand, Widerruf) |
| SEO & Structured Data | Organization mit Adresse + Telefon |
| Katalog-Copy | Kein „Demo-Katalog“ mehr |

---

## 🔴 Nur du — nach Deploy

### 1. Admin-Passwort in Render

1. [Render Dashboard](https://dashboard.render.com) → **buzzard-api** → **Environment**
2. **`ADMIN_PASSWORD`** setzen → Save → Restart
3. Login: [buzzard24.de/admin/login/](https://buzzard24.de/admin/login/) (`admin@buzzard24.de`)

### 2. Impressum vervollständigen (optional, empfohlen)

In GitHub → Settings → Secrets/Variables → Actions:

| Variable | Beispiel |
|----------|----------|
| `NEXT_PUBLIC_COMPANY_STREET` | Musterstraße 1 |
| `NEXT_PUBLIC_COMPANY_VAT_ID` | DE123456789 |

Dann GitHub Pages neu deployen (Push auf `main` oder Workflow manuell starten).

Ohne diese Werte: PLZ 35232 Dautphetal wird angezeigt.

### 3. Google Search Console (optional)

Siehe `docs/GOOGLE_SEARCH_CONSOLE.md` — Secret `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`.

---

## ⛔ Bewusst später (Verkauf)

- Echte Produktbilder & PIM-Import
- `BUZZARD_SALES_ENABLED=1`
- Stripe / PayPal / SMTP
- Commerce-Secrets für AI Core Phase 3

---

## Schnell-Checkliste

```
[ ] Admin-Passwort in Render
[ ] PR #238 gemergt + GitHub Pages deployed
[ ] Optional: Straße + USt-ID in GitHub Secrets
[ ] Optional: Google Search Console
```
