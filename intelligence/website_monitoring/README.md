# Buzzard Intelligence — Marketplace & Website Monitoring

Der Agent soll relevante E-Commerce-, Marketplace-, Preisvergleichs-, Retail-,
Automotive- und B2B-Websites regelmäßig beobachten.

## Was überwacht werden soll

Je nach erlaubter Datenquelle:
- neue Kategorien
- neue Produkte
- Produktverfügbarkeit
- öffentlich sichtbare Preise
- Preisänderungen
- Rabatte/Aktionen
- sichtbare Bestseller/Featured/Popular-Signale
- Marken
- Produktanzahl
- Kategorieänderungen
- Such-/Sortiertrends, wenn öffentlich und erlaubt
- sichtbare Liefer-/Versandinformationen
- Markt-/Länderverfügbarkeit
- relevante Wettbewerbsänderungen

## Rechtliche technische Regel

Der Agent darf nur:
1. offizielle APIs/Feeds/Partnerzugänge nutzen, wenn Buzzard dazu berechtigt ist,
2. oder öffentlich zugängliche Seiten nur im Rahmen ihrer Nutzungsbedingungen,
   robots/access rules und geltenden Rechtsvorgaben beobachten.

Keine CAPTCHA-Umgehung, kein Login-Bypass, kein Scraping geschützter Bereiche,
keine privaten Daten und keine Umgehung technischer Zugriffskontrollen.

Wenn eine Website keinen zulässigen Datenzugang bietet, wird sie als
`REVIEW_REQUIRED` markiert und nicht gewaltsam ausgelesen.

## Wichtig

Die Liste ist ein Startkatalog. Nicht jede Website bietet eine offene API.
Der Connector entscheidet deshalb zwischen:
API → Feed → autorisiertem Partnerzugang → zulässiger öffentlicher Recherche → REVIEW_REQUIRED.

## Start
```bash
cd intelligence
python main.py wsmon-status
python main.py wsmon-sites
python main.py wsmon-schedule
python main.py wsmon-test
```

## CLI
| Befehl | Zweck |
|--------|-------|
| `wsmon-status` | Katalog- und Verbindungsstatus |
| `wsmon-sites` | Alle Sites mit Status |
| `wsmon-catalog` | MANIFEST.json |
| `wsmon-schedule` | Monitor-Scheduler |
| `wsmon-fetch` | Autorisierten öffentlichen URL-Abruf |
| `wsmon-legal` | Legal Operation Rules |
| `wsmon-alerts` | Monitoring Alerts |
| `wsmon-test` | pytest auf `tests/` |

## Abgrenzung
- `live-*` = Live API Adapter (eBay, Amazon, Google Ads)
- `wsmon-*` = Marketplace/Website Monitoring Katalog + Policies
- `mplace-*` = v58 JSON Marketplace Intelligence Modul
