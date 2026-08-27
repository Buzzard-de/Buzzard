# 03 — E-Mail & Kontakt

## Öffentliche Kontaktdaten

| Kanal | Wert | Wo sichtbar |
|-------|------|-------------|
| E-Mail | info@buzzard24.de | Footer, Impressum, ServiceBar |
| Telefon | +49 151 26219394 | Impressum, Hilfe, ServiceBar |
| Admin | admin@buzzard24.de | Nur Admin-Bereich |

Zentrale Config: `lib/site/contact.ts`

## E-Mail-Provider: IONOS

| Eigenschaft | Status |
|-------------|--------|
| Postfach info@buzzard24.de | ✅ Eingerichtet |
| Webmail | https://webmail.ionos.de |
| Empfang getestet | ✅ Funktioniert |
| Anleitung | `docs/EMAIL_SETUP_IONOS.md` |

## Kontaktformular: FormSubmit

| Eigenschaft | Wert |
|-------------|------|
| Service | https://formsubmit.co |
| Ziel | info@buzzard24.de |
| Seiten | Impressum, Hilfe |
| Methode | Native HTML POST (kein AJAX) |
| Schutz | Honeypot, Rate-Limit, Zeit-Trap |
| Komponente | `components/ContactForm.tsx` |

### Ablauf

1. Besucher füllt Formular aus
2. POST an FormSubmit
3. FormSubmit leitet E-Mail an info@buzzard24.de
4. Redirect zurück mit `?sent=1`

## Newsletter (nach PR #238)

| Live (main) | Nach PR #238 |
|-------------|--------------|
| Nur lokale Fake-Meldung | FormSubmit → info@buzzard24.de |
| Kein echter Versand | Betreff: „Buzzard Newsletter-Anmeldung“ |

Komponente: `components/home/HomeNewsletter.tsx`

## Was nicht eingerichtet ist

- SMTP für System-Mails (Bestellbestätigungen) — erst mit Verkauf
- GitHub-Account Primär-E-Mail auf info@buzzard24.de — optional

## Support-Antwortzeit (Website-Text)

1–2 Werktage (Hilfe/FAQ)
