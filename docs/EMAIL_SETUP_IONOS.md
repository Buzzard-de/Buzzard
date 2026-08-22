# E-Mail bei IONOS einrichten — buzzard24.de

Öffentliche Kontaktadresse der Website: **`info@buzzard24.de`**

> Die Website ist bereits darauf vorbereitet. Diese Anleitung richtet das Postfach bei IONOS ein.

## Schritt 1 — Postfach anlegen

1. Einloggen: [my.ionos.de](https://my.ionos.de)
2. **Menü** → **E-Mail**
3. **Neue E-Mail-Adresse anlegen** → z. B. **Mail Basic**
4. Ausfüllen:
   - **E-Mail:** `info`
   - **Domain:** `buzzard24.de`
   - **Passwort:** sicheres Passwort (notieren!)
5. Optional: **Weiterleitungsziel hinzufügen** → private Gmail/Outlook, damit Mails auch dort ankommen
6. **Speichern** — Einrichtung kann einige Minuten dauern

**Kein freies Postfach?** Rechts unter „Portfolio“ prüfen. Falls 0 frei → **Bestellen** (Mail Basic ist günstig, oft im Hosting-Paket enthalten).

## Schritt 2 — MX-Records prüfen

Wenn Domain und E-Mail beide bei IONOS liegen, sind MX-Records meist **automatisch** gesetzt.

Manuell prüfen:

1. **Menü** → **Domains & SSL** → `buzzard24.de`
2. **DNS** / **DNS-Einstellungen**
3. Es müssen **genau diese** MX-Einträge existieren (andere MX-Einträge löschen):

| Typ | Hostname | Priorität | Wert |
|-----|----------|-----------|------|
| MX | @ | 10 | `mx00.ionos.de` |
| MX | @ | 10 | `mx01.ionos.de` |

Propagation: meist 5–30 Minuten, maximal 24 Stunden.

## Schritt 3 — Webmail testen

1. [webmail.ionos.de](https://webmail.ionos.de) öffnen
2. Login: `info@buzzard24.de` + Passwort
3. Test-Mail von einem anderen Account an `info@buzzard24.de` senden
4. E-Mail sollte im Posteingang (oder Weiterleitungsziel) ankommen

## Schritt 4 — Kontaktformular aktivieren (FormSubmit)

Die Website sendet Formular-Nachrichten über [FormSubmit](https://formsubmit.co):

1. Nach Deploy: [buzzard24.de/impressum/](https://buzzard24.de/impressum/) öffnen
2. Kontaktformular einmal absenden (Testnachricht)
3. In `info@buzzard24.de` kommt eine **Bestätigungs-Mail von FormSubmit**
4. Link in der Mail klicken → Formular ist danach aktiv

Ohne diesen Schritt werden Kontaktanfragen von der Website nicht zugestellt.

## Schritt 5 — Handy / Outlook (optional)

| Einstellung | Wert |
|-------------|------|
| IMAP-Server | `imap.ionos.de` |
| IMAP-Port | 993 (SSL/TLS) |
| SMTP-Server | `smtp.ionos.de` |
| SMTP-Port | 587 (STARTTLS) oder 465 (SSL) |
| Benutzername | `info@buzzard24.de` |
| Passwort | Postfach-Passwort |

## Später: Transaktions-E-Mails (Bestellbestätigung)

Wenn der Verkauf aktiv wird, in Render setzen:

```env
SMTP_HOST=smtp.ionos.de
SMTP_USER=info@buzzard24.de
SMTP_PASSWORD=<postfach-passwort>
CONTACT_EMAIL=info@buzzard24.de
```

## Checkliste

- [ ] Postfach `info@buzzard24.de` bei IONOS angelegt
- [ ] MX-Records: `mx00.ionos.de` + `mx01.ionos.de`
- [ ] Test-Mail empfangen
- [ ] FormSubmit-Bestätigung geklickt
- [ ] Website live: Impressum zeigt `info@buzzard24.de` und `+49 151 26219394`

## Häufige Probleme

| Problem | Lösung |
|---------|--------|
| „Fehler beim Anlegen“ | Externer Mailserver (z. B. Microsoft 365) blockiert IONOS — MX-Records prüfen |
| Keine Mails empfangen | MX-Records prüfen, 30 Min. warten, Spam-Ordner prüfen |
| Formular sendet nicht | FormSubmit-Bestätigungslink noch nicht geklickt |
| Website zeigt alte E-Mail | PR #232 mergen + GitHub Pages neu deployen |
