# /var/data — Schnellfix (Disk schon da)

**Live-Diagnose (30. Aug 2026):**

| Check | Status |
|-------|--------|
| `/var/data` gemountet | **✅ ja** (`exists: true`, `writable: true`) |
| `BUZZARD_DB_PATH` | **❌ fehlt** |
| `BUZZARD_BACKUP_DIR` | **❌ fehlt** |
| Aktueller DB-Pfad | `/opt/render/project/src/server/data/buzzard.db` (ephemeral) |

Dein Blueprint-Sync hat die **Disk bereits angelegt**. Es fehlen nur **2 Env-Variablen + Redeploy**.

---

## Option A — Render Dashboard (2 Minuten)

1. Öffnen: [Render → buzzard-api → Environment](https://dashboard.render.com)
2. **Add Environment Variable:**

   | Key | Value |
   |-----|-------|
   | `BUZZARD_DB_PATH` | `/var/data/buzzard.db` |
   | `BUZZARD_BACKUP_DIR` | `/var/data/backups` |

3. **`BUZZARD_SALES_ENABLED`** auf `0` lassen (nicht ändern)
4. **Save Changes** → Render startet Deploy automatisch  
   (oder: **Manual Deploy** → Deploy latest commit)
5. Nach ~5 Min. prüfen:

```bash
npm run verify:db-persistence
```

Erwartung: **PASS** — `path: /var/data/buzzard.db`, `persistent: true`

Beim ersten Start kopiert der Server die 26 bestehenden Produkte automatisch von ephemeral nach `/var/data`.

---

## Option B — GitHub Actions (wenn `RENDER_API_KEY` Secret gesetzt)

1. GitHub → **Actions** → **Setup Production Remaining**
2. **Run workflow** → `apply_render: true`

Oder CLI:

```bash
gh workflow run setup-production-remaining.yml -f apply_render=true
```

---

## Option C — Lokal mit API-Key

```bash
RENDER_API_KEY=rnd_... node scripts/setup-production-remaining.mjs --apply
```

Setzt Env + triggert Deploy (Disk wird übersprungen, ist schon da).

---

## Verifikation

```bash
curl -s https://buzzard-api.onrender.com/api/health/db | jq '.database | {path, persistence}'
```

```json
{
  "path": "/var/data/buzzard.db",
  "persistence": {
    "persistent": true,
    "mode": "render_persistent_disk"
  }
}
```

Danach Backup testen:

```bash
npm run backup:db
```
