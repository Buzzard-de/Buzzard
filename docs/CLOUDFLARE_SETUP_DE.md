# Cloudflare vor buzzard24.de

Schritt-für-Schritt für **DDoS-Schutz, Bot-Filter und optional WAF** — ohne Code-Änderung.

## Voraussetzungen

- Domain **buzzard24.de** bei IONOS (oder anderem Registrar)
- GitHub Pages läuft bereits (CNAME auf `Buzzard-de.github.io` o. ä.)

## 1. Cloudflare-Account

1. https://dash.cloudflare.com → Account anlegen (Free Plan reicht)
2. **Add a site** → `buzzard24.de`
3. Plan: **Free**

## 2. DNS zu Cloudflare umziehen

Cloudflare zeigt zwei Nameserver, z. B.:

```
ada.ns.cloudflare.com
bob.ns.cloudflare.com
```

Bei **IONOS** → Domain → Nameserver → auf Cloudflare-NS umstellen.

Propagation: oft 15 Min. bis 48 Std.

## 3. DNS-Einträge in Cloudflare

| Typ | Name | Inhalt | Proxy |
|-----|------|--------|-------|
| CNAME | `@` oder `www` | GitHub Pages Host (z. B. `buzzard-de.github.io`) | Proxied (orange Wolke) |
| — | API | `buzzard-api.onrender.com` nur wenn Subdomain gewünscht | DNS only (grau) |

**Wichtig:** GitHub Pages Custom Domain in Repo-Settings muss `buzzard24.de` enthalten.

Render-API (`buzzard-api.onrender.com`) kann direkt bleiben — muss nicht über Cloudflare, außer ihr nutzt `api.buzzard24.de`.

## 4. SSL/TLS

Cloudflare → **SSL/TLS** → Modus: **Full (strict)**

GitHub Pages und Render liefern bereits HTTPS.

## 5. Empfohlene Einstellungen (Free)

- **Security → Settings:** Security Level = Medium
- **Bots:** Bot Fight Mode aktivieren (optional)
- **Caching:** Standard für statische Website OK

## 6. Test

```bash
curl -I https://buzzard24.de
```

Header `cf-ray` zeigt Cloudflare aktiv.

## Was Cloudflare nicht ersetzt

- Render-Admin-Passwort (`ADMIN_SETUP_DE.md`)
- FormSubmit / IONOS E-Mail
- Verkauf / Zahlungs-Keys (bewusst aus)

Weitere Security-Übersicht: `docs/SECURITY.md`
