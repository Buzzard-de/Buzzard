# E-Mail für buzzard24.de einrichten

Die Website nutzt **`info@buzzard24.de`** als öffentliche Kontaktadresse (Footer, Impressum, Kontaktformular).

## Domain bei IONOS → siehe dedizierte Anleitung

**→ [docs/EMAIL_SETUP_IONOS.md](./EMAIL_SETUP_IONOS.md)** (Schritt-für-Schritt für IONOS)

## Empfohlene Adressen

| Adresse | Zweck |
|---------|--------|
| `info@buzzard24.de` | Öffentlicher Kontakt, Impressum, Kontaktformular |
| `admin@buzzard24.de` | Intern: Render-API Admin-Login (optional) |

## Option A — Cloudflare Email Routing (kostenlos)

Wenn die Domain **buzzard24.de** bei Cloudflare liegt (siehe `docs/SECURITY.md`):

1. Cloudflare Dashboard → **Email** → **Email Routing** → aktivieren
2. **Destination address** hinzufügen (z. B. deine private Gmail/Outlook-Adresse) und per Bestätigungslink verifizieren
3. **Custom address** anlegen: `info` → Weiterleitung an deine Zieladresse
4. Cloudflare setzt die nötigen **MX-** und **SPF**-Records automatisch
5. Test: E-Mail an `info@buzzard24.de` senden — sollte in deinem Postfach ankommen

**Kontaktformular (FormSubmit):**

1. Auf der Website `/impressum/` das Formular einmal absenden (oder direkt auf [formsubmit.co](https://formsubmit.co) testen)
2. FormSubmit schickt eine Bestätigungs-Mail an `info@buzzard24.de` — Link klicken
3. Danach leitet das Formular Anfragen an diese Adresse weiter

## Option B — Zoho Mail (kostenlos bis 5 Nutzer)

Für ein echtes Postfach unter `@buzzard24.de` ohne Weiterleitung:

1. [Zoho Mail](https://www.zoho.com/mail/) → Domain `buzzard24.de` hinzufügen
2. MX-Records beim Domain-Registrar (oder Cloudflare DNS) setzen — Werte von Zoho übernehmen
3. SPF: `v=spf1 include:zoho.eu ~all` (exakte Werte in Zoho-Dashboard)
4. Postfach `info@buzzard24.de` anlegen
5. FormSubmit wie oben verifizieren

## Option C — Google Workspace (kostenpflichtig)

1. Google Workspace → Domain verifizieren
2. MX-Records auf Google setzen
3. Nutzer `info@buzzard24.de` anlegen
4. FormSubmit verifizieren

## Transaktions-E-Mails (später, wenn Verkauf aktiv)

Für Bestellbestätigungen etc. SMTP in Render setzen (`render.yaml` / Dashboard):

```env
SMTP_HOST=smtp.zoho.eu
SMTP_USER=info@buzzard24.de
SMTP_PASSWORD=<app-passwort>
CONTACT_EMAIL=info@buzzard24.de
```

Zoho/Google: App-Passwort verwenden, kein normales Login-Passwort.

Ohne SMTP werden Bestell-E-Mails nur in `server/data/notification-queue.json` gequeued (Demo-Modus).

## Website-Konfiguration (optional)

In GitHub Actions / Build-Umgebung (nicht zwingend, Standard ist `info@buzzard24.de`):

```env
NEXT_PUBLIC_CONTACT_EMAIL=info@buzzard24.de
NEXT_PUBLIC_CONTACT_PHONE=+49XXXXXXXXX
NEXT_PUBLIC_CONTACT_PHONE_DISPLAY=+49 XXX XXXXXXX
```

Nach Änderung: Frontend neu bauen und deployen.

## Checkliste

- [ ] MX-Records für `buzzard24.de` gesetzt (Cloudflare / Zoho / Google)
- [ ] Test-Mail an `info@buzzard24.de` empfangen
- [ ] FormSubmit für Kontaktformular bestätigt
- [ ] Impressum zeigt die richtige Adresse (live prüfen)
- [ ] (Später) SMTP in Render für Bestell-E-Mails
