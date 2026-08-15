# Doğu Bey + Aslan Bey v1

Erweiterung von **v29 Official Verification** um den Müsteşar-/Koordinationslayer **Aslan Bey v1**.

## Rollen

| Rolle | Modul | Aufgabe |
|-------|-------|---------|
| **Doğu Bey** | `verify.py` (v29) | Recherche, Quellen, Claim-Verifikation |
| **Aslan Bey** | `aslan.py` (v1) | Aufgaben, Koordination, Review, Dashboard |

## CLI

```bash
cd intelligence
python main.py init-v29          # v29 + Aslan-Tabellen
python main.py aslan-task --title "..." --objective "..." --priority HIGH
python main.py aslan-status --task-id 1 --status IN_PROGRESS
python main.py aslan-result --task-id 1 --summary "..."
python main.py aslan-review --task-id 1 --claim-id 1 --notes "..."
python main.py aslan-dashboard
```

Bestehende v29-Befehle: `verify-claim`, `verify-source`, `verify-set`, `verify-demo`, `verify-report`

## Architektur

- Gleiche SQLite-DB: `buzzard_official_verification_v29.db`
- `claims`, `sources`, `verification_events` unverändert
- Neu: `aslan_tasks`, `aslan_task_events`, `aslan_reviews`

Siehe auch: `dogubey_aslan/README.md`, `dogubey/README.md` (standalone tek klasör)
