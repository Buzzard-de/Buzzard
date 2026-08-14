# Buzzard Intelligence — Live Data Connector Pack

Dieses Paket verbindet die Intelligence-Architektur mit echten Datenquellen, sobald die
jeweiligen autorisierten Zugangsdaten vorhanden sind.

## Enthaltene Live-Connectoren

1. **eBay Browse API** — öffentliche Marketplace-Daten wie Listings, Preise, GTIN,
   Kategorien, Verkäuferinformationen und Verfügbarkeit. eBay verlangt OAuth 2.0;
   Application Tokens sind für passende nicht-benutzerbezogene Ressourcen vorgesehen.
2. **Amazon Creators API** — Produkt-/Angebotsdaten über die aktuelle Creators API.
   Amazon hat die frühere Product Advertising API ab 15.05.2026 abgekündigt; deshalb
   wird hier bewusst die Creators API vorbereitet.
3. **Google Ads API** — Such-/Werbedaten für das eigene autorisierte Google-Ads-Konto.
   OAuth 2.0 und Developer Token sind erforderlich.
4. **Authorized URL Fetcher** — ruft nur vom Nutzer ausdrücklich freigegebene URLs ab
   und speichert Rohdaten mit Zeitstempel und SHA-256-Hash.

## Sicherheit

- Keine Passwörter oder API-Secrets im Code.
- Secrets kommen ausschließlich aus `.env`/Umgebungsvariablen.
- Keine Umgehung von CAPTCHA, Login-Sperren, robots/access controls oder Paywalls.
- Keine privaten Konten oder geschützten Daten.
- Jede Beobachtung erhält Quelle, Zeitstempel und Connector.
- Rate Limits und Nutzungsbedingungen der jeweiligen Quelle sind einzuhalten.

## Konfiguration

Kopiere `.env.example` nach `.env` und trage die Zugangsdaten ein.

```bash
cd intelligence
python main.py live-health
python main.py live-ebay --query "5W-30 Motoröl"
python main.py live-amazon --query "5W-30 Motor Oil"
python main.py live-google-ads
python main.py live-fetch --url "https://example.com"
```

Ohne Credentials liefern die geschützten Connectoren einen klaren
`NOT_CONFIGURED`-Status statt erfundener Daten.

**Abgrenzung:** v23 `connector-*` = Connector-Hub-Metadaten · v42 `pubconn-*` = JSON-Stub · `live-*` = echte API-Adapter

Siehe auch: `CONNECT_STATUS.md`, `DATA_SOURCE_MATRIX.md`
