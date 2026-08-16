# Doğu Bey — DE E-Commerce Intelligence Scans

Nach **jedem Scan** werden die Ergebnisse automatisch hier gespeichert:

- `latest/` — immer der letzte Scan
- `YYYY-MM-DD_HHMMSS/` — Archiv pro Scan-Lauf

Auslösen:
```bash
cd intelligence
python3 main.py complete-de-ecom-intel-scan
```

Oder per API: `POST /operations/de-ecom-intel-scan` bzw. `POST /bey/de-ecom-intel-scan`
