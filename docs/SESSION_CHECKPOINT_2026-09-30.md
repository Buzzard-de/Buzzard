# Buzzard — Session Checkpoint 2026-09-30

**Weiter genau hier.** Kurzfassung: `exports/buzzard-session-checkpoint-2026-09-30.md`

## Git

| Feld | Wert |
|------|------|
| Branch | `cursor/master-integration-foundation-c293` |
| HEAD | `00dd094` (`feat(commerce): route cart, checkout, and orders through Product D`) |
| Eltern | `b043c48` Phase-2 engines · `ea5bdf2` SoT foundation |
| PR | https://github.com/Buzzard-de/Buzzard/pull/377 (draft, base `main`) |
| Working tree | clean at save time |

Nicht auf `cursor/pim-catalog-foundation-c293` weiterarbeiten (kein Product-SoT-Validator dort).

## Was fertig ist (Code, PR #377)

- Phase 1: Product SoT foundation, Sales-Safety-Gate (`PRODUCT_SOT_ACTIVE` / Sales bleiben aus).
- Phase 2: Identity-Map, Collision-Detector, D als TARGET (nicht exclusive-active).
- Phase 3: Cart / Checkout / Order über Product **D**; Payment fail-closed; Sales locked.
- Validator-CLI: `npm run product:sot:validate -- <export.json>`
- Abhängigkeit: `better-sqlite3` in `server/package.json` (`cd server && npm ci`).

## Gates (unverändert)

- `PRODUCT_SOT_ACTIVE`: **OFF**
- Sales: **LOCKED**
- Kein exclusive SoT ohne echten Production-Identity-Export A–G
- Workspace-Seed/Demo ist **nicht** Production

## Production Identity (Stand 2026-09-30)

Authorized Render-Zugriff in der Cloud-Agent-Umgebung: **NOT AVAILABLE**

| Check | Ergebnis |
|-------|----------|
| Render CLI / `~/.render` | fehlt |
| SSH / `~/.ssh` | fehlt |
| Render MCP / Self-hosted Worker | fehlt |
| `RENDER_API_KEY` / Deploy-Hook / Admin-Token / Password / JWT in Env | ABSENT (Namen geprüft, Werte nicht geloggt) |
| `/var/data/buzzard.db` lokal | NOT FOUND |
| Identity-Export `/tmp/buzzard-production-identity.json` | BLOCKED |
| `product:sot:validate` gegen Production-Export | NOT RUN |

Öffentliches `https://buzzard-api.onrender.com` (Health) ist **kein** Host-Zugriff auf `/var/data/buzzard.db`.

## Morgen zuerst

1. Branch `cursor/master-integration-foundation-c293` @ `00dd094` (oder Nachfolge-Commit auf derselben PR).
2. Operator-Pfad: bereits autorisierte Render-Shell/SSH **oder** vorhandene Admin-Session — **kein** Credential-Raten, **kein** JWT aus `JWT_SECRET` bauen, **kein** 401-Bypass.
3. READ-ONLY: `test -f /var/data/buzzard.db` und `test -r /var/data/buzzard.db`.
4. Nur wenn lesbar: sqlite `PRAGMA query_only=ON;` Tabellen + Identity A–G nach `/tmp/buzzard-production-identity.json`.
5. Danach: `npm run product:sot:validate -- /tmp/buzzard-production-identity.json`
6. Bei BLOCKED: nicht umgehen. Bei PASS: trotzdem **kein** `PRODUCT_SOT_ACTIVE`, **kein** Sales.

Identity-Quellen: A P1 · B PIM · C PIM30 · D PIM Core (TARGET) · E products · F supplier_products · G marketplace listings/mappings.

## Verbote

NO INSERT/UPDATE/DELETE, NO MIGRATION, NO SCHEMA CHANGE, keine Secrets in Git/Logs/Dateien, keine neuen Admin-Accounts.
