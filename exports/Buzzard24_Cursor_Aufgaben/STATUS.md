# Buzzard24 Cursor Aufgaben — Status

**Stand:** 27. August 2026  
**Quelle:** `Buzzard24_Cursor_Aufgaben.zip` (ChatGPT-Arbeitspaket)  
**Grenzen:** Kein Verkauf · Keine echten Produktbilder · Keine Commerce-Secrets

---

## P0 — Sofort

| # | Aufgabe | Status | Hinweis |
|---|---------|--------|---------|
| 01 | Merge & Deploy (PR #238) | ✅ **Erledigt** | Gemergt auf `main`, GitHub Pages deployt |
| 02 | Admin-Passwort | ⏳ **Nur du** | Render → `ADMIN_PASSWORD` → `docs/ADMIN_SETUP_DE.md` |
| 03 | AI Orchestrator | 🟡 **Code OK, Deploy offen** | In Repo; Render Blueprint Sync nötig (`buzzard-orchestrator`) |
| 04 | Security | 🟡 **Basis OK** | Auth, CSP, Rate-Limit da; RBAC/Esat Bey P1 |

---

## P1 — Vor Produktionsreife

| # | Aufgabe | Status |
|---|---------|--------|
| 05 | Katalog/PIM Schema | ⏳ Offen |
| 06 | Supplier/XML/TecDoc Adapter | ⏳ Offen (Mock) |
| 07 | Preis/Stok | ⏳ Offen |
| 08 | Product AI | ⏳ Offen |
| 09 | Category AI | ⏳ Offen |
| 10 | Customs AI | 🟡 Orchestrator-Agent da, Adapter offen |
| 11 | Order Prep (ohne Verkauf) | ⏳ Offen |
| 12 | SEO / Google | 🟡 Basis OK, Search Console offen |
| 13 | i18n/UX | 🟡 DE/EN/TR/AR live, Feinschliff offen |
| 14 | QA / Tests | 🟡 verify-go-live da, Orchestrator-Tests offen |
| 15 | Production Readiness | 🟡 Docs teilweise (`MONITORING.md`, …) |

---

## Gesamtfortschritt (dieses Paket)

| Priorität | Erledigt | Offen |
|-----------|----------|-------|
| **P0** | ~60 % | Admin-Passwort, Orchestrator-Deploy |
| **P1** | ~15 % | Großteil noch offen |
| **Paket gesamt** | **~35 %** | P1-Infrastruktur steht aus |

---

## Nächste Schritte (Reihenfolge)

1. **Du:** `ADMIN_PASSWORD` in Render
2. **Du:** Render Blueprint Sync → `buzzard-orchestrator` live
3. **Cursor:** P1 nacheinander (05 → 06 → …) — auf Anfrage

---

## Dateien in diesem Ordner

| Datei | Inhalt |
|-------|--------|
| `README_CURSOR.md` | Regeln & Grenzen |
| `01`–`15` | Einzelaufgaben P0/P1 |
| `16_DO_NOT_DO.md` | Verboten (Verkauf, Bilder, …) |
| `17_CURSOR_MASTER_PROMPT.md` | Master-Prompt für Cursor |

ZIP: `exports/Buzzard24_Cursor_Aufgaben.zip`
