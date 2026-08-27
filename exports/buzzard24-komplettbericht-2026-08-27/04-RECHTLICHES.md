# 04 — Rechtliches & Compliance

## Seiten

| Seite | URL | Status live | Nach PR #238 |
|-------|-----|-------------|--------------|
| Impressum | /impressum/ | ✅ Basis | + PLZ, OS-Plattform, USt-ID-fähig |
| Datenschutz | /datenschutz/ | ✅ DSGVO | + FormSubmit, Render, Newsletter |
| AGB | /agb/ | ✅ Stub | Fertige Katalog-AGB |
| Widerruf | /widerruf/ | ✅ Stub | Katalogmodus erklärt |
| Versand | /versand/ | ✅ Stub | Kein Versand im Katalog |
| Hilfe/FAQ | /hilfe/ | ✅ | Backend live, FAQ aktualisiert |

## Impressum — aktuell vs. vollständig

**Live (main):**
```
Buzzard Kfz-Teile
Dautphetal
Deutschland
Tel: +49 151 26219394
E-Mail: info@buzzard24.de
```

**Nach PR #238 (Standard ohne Secrets):**
```
Buzzard Kfz-Teile
35232 Dautphetal
Deutschland
```

**Empfohlen (GitHub Secrets):**
- `NEXT_PUBLIC_COMPANY_STREET` — Straße + Hausnummer
- `NEXT_PUBLIC_COMPANY_VAT_ID` — USt-IdNr.

Config: `lib/site/company.ts`

## DSGVO

- Keine Tracking-Cookies
- FormSubmit als Auftragsverarbeiter (Kontakt + Newsletter)
- Render als Backend-Host (Kundenkonto)
- GitHub Pages als Website-Host
- Betroffenenrechte: info@buzzard24.de

## Katalogmodus rechtlich

- Kein Fernabsatz aktiv → kein Widerrufsrecht für Käufe
- Produktdarstellung = unverbindliche Information
- AGB §3 Katalogmodus (PR #238)

## Online-Streitbeilegung

OS-Plattform verlinkt (PR #238) — keine Pflicht zur Teilnahme an Schlichtung

## Security

- CSP, HSTS, Rate-Limiting
- Admin 2FA verfügbar
- Details: `docs/SECURITY.md`
- security.txt: `public/.well-known/security.txt`

## Offen (rechtlich)

| Punkt | Priorität |
|-------|-----------|
| Volle Straßenadresse | Hoch |
| USt-IdNr. (falls vorhanden) | Mittel |
| AGB für aktiven Verkauf | Erst bei Verkaufsstart |
