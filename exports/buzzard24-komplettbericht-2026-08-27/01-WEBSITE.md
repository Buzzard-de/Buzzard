# 01 — Website (Frontend)

## Hosting

| Eigenschaft | Wert |
|-------------|------|
| URL | https://buzzard24.de |
| Hosting | GitHub Pages |
| Framework | Next.js 15 (Static Export) |
| Deploy | Push auf `main` → `.github/workflows/deploy-pages.yml` |
| CDN/SSL | GitHub Pages TLS |

## Seiten (öffentlich)

| Route | Status | Inhalt |
|-------|--------|--------|
| `/` | ✅ Live | Startseite, Kategorien, Produkte |
| `/kategorie/…` | ✅ Live | 53 Hauptkategorien, Mehrsprachigkeit |
| `/produkt/…` | ✅ Live | Produktseiten (Demo-Daten) |
| `/impressum/` | ✅ Live | Impressum + Kontaktformular |
| `/datenschutz/` | ✅ Live | DSGVO |
| `/hilfe/` | ✅ Live | FAQ + Kontakt |
| `/agb/` | ✅ Live | AGB Katalogmodus |
| `/versand/` | ✅ Live | Versand-Info (kein Versand aktiv) |
| `/widerruf/` | ✅ Live | Widerrufsrecht |
| `/kontakt/` | ✅ Redirect | → `/impressum/` |
| `/admin/login/` | ✅ Live | Admin (Passwort in Render) |
| `/sitemap.xml` | ✅ Live | SEO Sitemap |
| `/robots.txt` | ✅ Live | Crawler-Regeln |

## Katalogmodus

- `NEXT_PUBLIC_SALES_ENABLED=0` — keine Preise, kein Checkout
- Produkte zeigen „Preis auf Anfrage“
- Warenkorb/Checkout-Seiten existieren, Bestellung wird API-seitig blockiert

## Kontakt auf der Website

| Kanal | Wert |
|-------|------|
| E-Mail | info@buzzard24.de |
| Telefon | +49 151 26219394 |
| Formular | FormSubmit auf Impressum + Hilfe |
| Zentrale Config | `lib/site/contact.ts` |

## Live vs. PR #238 (noch nicht gemergt)

**Aktuell live** (main @ ec4a21a):
- Texte enthalten noch „Demo-Katalog“, „VERKAUF FOLGT DEMNÄCHST“
- Newsletter zeigt nur lokale Bestätigung (kein echter Versand)

**Nach PR #238:**
- Professionelle Katalog-Texte
- Newsletter → FormSubmit
- Dynamische Kategorieanzahl (53)
- Zentrale Firmendaten mit PLZ 35232 Dautphetal
- Rechtliche Seiten ohne Stub-Hinweis

## Wichtige Dateien im Repo

```
app/                    # Next.js Seiten
components/             # UI (Header, Footer, ContactForm, …)
lib/site/contact.ts     # E-Mail + Telefon
lib/site/company.ts     # Firmendaten (PR #238)
lib/i18n/               # DE, EN, TR, AR
lib/categories/         # 53 Kategorien
public/_redirects       # Legacy-Redirects
.github/workflows/deploy-pages.yml
```

## Mehrsprachigkeit

- Deutsch (Standard), Englisch, Türkisch, Arabisch (RTL)
- Locale-Pfade: `/en/`, `/tr/`, `/ar/`
