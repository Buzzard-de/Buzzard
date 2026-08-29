# SQLite Persistent Disk — Render (buzzard-api)

**Stand:** 29. Aug 2026 · **Sales bleiben AUS** (`BUZZARD_SALES_ENABLED=0`)

---

## Aktueller Live-Status

| Check | Live (ohne Sync) | Ziel |
|-------|------------------|------|
| DB path | `/opt/render/project/src/server/data/buzzard.db` | `/var/data/buzzard.db` |
| `persistent` | **false** | **true** |
| Plan | Free (ephemeral) | **Starter** + Disk |

Im Repo ist alles vorbereitet (`render.yaml`). **Render Dashboard** muss synchronisiert werden.

---

## Option A — Blueprint Sync (empfohlen, ~5 Min.)

1. Öffnen: **[Render Blueprint](https://dashboard.render.com/blueprint/new?repo=https://github.com/Buzzard-de/Buzzard)**
2. Bestehenden Stack **Buzzard** auswählen → **Sync** / **Apply**
3. Bestätigen:
   - `buzzard-api` → Plan **Starter**
   - Disk **1 GB** at **`/var/data`**
   - Env: `BUZZARD_DB_PATH=/var/data/buzzard.db`, `BUZZARD_BACKUP_DIR=/var/data/backups`
   - `BUZZARD_SALES_ENABLED=0` (unverändert)
4. Deploy abwarten (~5–10 Min., ggf. kurzer Downtime wegen Disk)
5. Prüfen:

```bash
curl -s https://buzzard-api.onrender.com/api/health/db | jq '.database | {path, persistence}'
```

Erwartung:

```json
{
  "path": "/var/data/buzzard.db",
  "persistence": { "persistent": true, "mode": "render_persistent_disk" }
}
```

Beim **ersten** Start mit Disk kopiert der Server die bestehende ephemeral DB automatisch nach `/var/data/buzzard.db` (26 Produkte bleiben erhalten).

---

## Option B — Manuell im Dashboard

1. [Render Dashboard](https://dashboard.render.com) → **`buzzard-api`**
2. **Settings** → Plan → **Starter** (Upgrade)
3. **Disks** → Add Disk:
   - Mount path: **`/var/data`**
   - Size: **1 GB**
4. **Environment** → setzen / prüfen:

```
BUZZARD_DB_PATH=/var/data/buzzard.db
BUZZARD_BACKUP_DIR=/var/data/backups
BUZZARD_SALES_ENABLED=0
```

5. **Manual Deploy** → Deploy latest commit
6. Health prüfen (siehe oben)

---

## Option C — GitHub Actions (wenn `RENDER_API_KEY` Secret gesetzt)

1. GitHub → **Actions** → **Setup Production Remaining**
2. **Run workflow** → `apply_render: true`
3. Workflow setzt Plan, Disk, Env und triggert Deploy

Oder lokal:

```bash
RENDER_API_KEY=rnd_... node scripts/setup-production-remaining.mjs --apply
```

---

## Nach erfolgreichem Mount

```bash
# Persistenz verifizieren
npm run verify:db-persistence

# Erstes Backup auf Disk (Render Shell oder One-Off Job)
BUZZARD_DB_PATH=/var/data/buzzard.db BUZZARD_BACKUP_DIR=/var/data/backups npm run backup:db
node scripts/sync-search-index.mjs
```

---

## Kosten

- Render **Starter** + 1 GB Disk ≈ **~7 €/Monat** (Stand Render Free/Starter Pricing)
- Kein Verkauf / keine Stripe-Kosten

---

## Sicherheit

- **Nicht** `BUZZARD_SALES_ENABLED=1` setzen
- **Nicht** `BUZZARD_TEST_MODE=1` in Production
- Go-Live Lock bleibt aktiv

---

## Troubleshooting

| Problem | Lösung |
|---------|--------|
| `persistent: false` nach Deploy | Env `BUZZARD_DB_PATH` prüfen; Disk mount `/var/data` |
| Deploy hängt | Disk-Attach erzwingt Neustart — 5–10 Min. warten |
| Leere DB nach Mount | Migration läuft nur wenn alte DB auf ephemeral path existiert — ggf. `backup:db` restore |
| Blueprint ändert Sales | `BUZZARD_SALES_ENABLED=0` in Environment fixieren |

Siehe auch: `docs/SETUP_REMAINING_DE.md`, `docs/BACKUP_RESTORE.md`
