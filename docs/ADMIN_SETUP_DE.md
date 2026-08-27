# Admin-Zugang einrichten — Buzzard24

Einmalige Schritte für den **Admin-Bereich** auf [buzzard24.de/admin/login/](https://buzzard24.de/admin/login/).

## 1. Passwort in Render setzen

1. [Render Dashboard](https://dashboard.render.com) öffnen
2. Service **`buzzard-api`** → **Environment**
3. Variable **`ADMIN_PASSWORD`**:
   - Beim ersten Deploy wurde ggf. ein Zufallswert generiert — ersetzen durch ein sicheres Passwort
   - Mindestens 12 Zeichen, Passwort-Manager empfohlen
4. **Save Changes** → Service startet neu (ca. 1–2 Min.)

## 2. Anmelden

| Feld | Wert |
|------|------|
| E-Mail | `admin@buzzard24.de` |
| Passwort | Das aus Render (`ADMIN_PASSWORD`) |

URL: https://buzzard24.de/admin/login/

## 3. Zwei-Faktor-Authentifizierung (empfohlen)

1. Nach Login: **Plattform → Security Log** (`/admin/security-dashboard/`)
2. **2FA einrichten** → QR-Code in Authenticator-App (Google Authenticator, Authy, …)
3. 6-stelligen Code eingeben und aktivieren

Details: `docs/SECURITY.md`

## 4. Prüfen

```bash
curl https://buzzard-api.onrender.com/api/health
npm run verify:go-live
```

Erwartet: `"status":"ok"`, `salesEnabled: false`

## Passwort vergessen?

Render → **buzzard-api** → **Environment** → `ADMIN_PASSWORD` neu setzen → Save → Restart → erneut anmelden.

**Niemals** das Passwort in Git oder Chat posten.

## Orchestrator-Status (optional)

Nach Deploy des AI-Orchestrators:

```bash
curl https://buzzard-api.onrender.com/api/orchestrator/status
```
