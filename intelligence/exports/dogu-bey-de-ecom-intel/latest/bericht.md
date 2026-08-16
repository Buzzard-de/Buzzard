# Deutschland E-Commerce Intelligence — Doğu Bey

**Operation:** DE-ECOM-INTEL-01-LIVE
**Datum:** 2026-08-16
**Agent:** dogu_bey

## Zusammenfassung

- Prioritätskategorien gescannt: 6
- Category Intelligence Agenten aktiv: 43
- Council Findings: 6
- Preisbenchmark-Produkte: 6
- Preisquelle: oeffentliche_benchmarks

## Live Connectors

- **eBay Browse API**: NOT_CONFIGURED (EBAY_CLIENT_ID, EBAY_CLIENT_SECRET)
- **Amazon Creators API**: NOT_CONFIGURED (AMAZON_CLIENT_ID, AMAZON_CLIENT_SECRET, AMAZON_REFRESH_TOKEN, AMAZON_PARTNER_TAG)
- **Google Ads API**: NOT_CONFIGURED (GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_REFRESH_TOKEN, GOOGLE_ADS_CUSTOMER_ID)
- **Public URL Fetcher**: READY

## Öffentliche Quellen

- [bevh Halbjahresbericht Onlinehandel](https://bevh.org/en/detail/first-half-of-the-year-in-online-retail-germans-willingness-to-spend-is-returning) — OK
  > <!DOCTYPE html> <html lang="en-EN"> <head> <meta charset="utf-8"> <!-- {$config.headerComment} This website is powered by TYPO3 - inspiring people to share! TYPO3 is a free open source Content Managem...
- [Top 100 Online-Shops Deutschland](https://ecommercegermany.com/blog/top-100-online-stores-in-germany/) — OK
  > <!DOCTYPE html> <html lang="en-US"> <head> <title>Top 100 online stores in Germany [2026] - E-commerce Germany News</title> <meta charset="UTF-8" /> <meta name="viewport" content="width=device-width, ...

## Kategorie-Berichte

### Automotive (cat-05)

- Agent: CATEGORY_05
- Wettbewerber: Amazon.de, AutoDoc, kfzteile24, eBay
- Angebote analysiert: 3
- Verkäufer: 3
- Preis (min/median/max): 34.94 / 34.99 / 37.49 EUR
- Kategorielücken: 3

### Reinigungsprodukte (cat-03)

- Agent: CATEGORY_03
- Wettbewerber: dm.de, rossmann.de, Amazon.de
- Angebote analysiert: 3
- Verkäufer: 3
- Preis (min/median/max): 2.49 / 6.14 / 6.2 EUR
- Kategorielücken: 2

### Garten (cat-07)

- Agent: CATEGORY_07
- Wettbewerber: OBI, Bauhaus, Hornbach, ManoMano, Amazon.de
- Angebote analysiert: 4
- Verkäufer: 4
- Preis (min/median/max): 19.99 / 28.23 / 30.979999999999997 EUR
- Kategorielücken: 2

### Werkzeuge & Eisenwaren (cat-09)

- Agent: CATEGORY_09
- Wettbewerber: Hornbach, Bauhaus, Amazon.de, ManoMano
- Angebote analysiert: 3
- Verkäufer: 3
- Preis (min/median/max): 79.99 / 94.98 / 100.97999999999999 EUR
- Kategorielücken: 2

### Elektronik (cat-12)

- Agent: CATEGORY_12
- Wettbewerber: Amazon.de, MediaMarkt, Saturn
- Angebote analysiert: 3
- Verkäufer: 3
- Preis (min/median/max): 8.99 / 17.98 / 19.98 EUR
- Kategorielücken: 2

### Haushaltsgeräte (cat-13)

- Agent: CATEGORY_13
- Wettbewerber: MediaMarkt, Saturn, Amazon.de
- Angebote analysiert: 3
- Verkäufer: 3
- Preis (min/median/max): 99.0 / 123.99 / 129.0 EUR
- Kategorielücken: 2


## Preisbenchmark

### motoroel-5w30-5l

### allzweckreiniger-1l

### gartenschlauch-20m

### akku-bohrmaschine-set

### usb-c-kabel-2m

### luftreiniger-hepa


## Google Ads Signale

- Status: NOT_CONFIGURED

## Hinweise

- eBay Browse API: NOT_CONFIGURED — EBAY_CLIENT_ID, EBAY_CLIENT_SECRET in intelligence/.env eintragen.
- Amazon Creators API: NOT_CONFIGURED — AMAZON_CLIENT_ID, AMAZON_CLIENT_SECRET, AMAZON_REFRESH_TOKEN, AMAZON_PARTNER_TAG in intelligence/.env eintragen.
- Google Ads API: NOT_CONFIGURED — GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_REFRESH_TOKEN, GOOGLE_ADS_CUSTOMER_ID in intelligence/.env eintragen.
- Keine Marketplace-Live-Preise — Fallback auf öffentliche Benchmarks + live-fetch.
- Nur öffentliche Quellen verwendet. Keine Login-, CAPTCHA- oder Bypass-Versuche.
- Verkäufe bei Buzzard bleiben deaktiviert (Katalogmodus). Scan dient der Entscheidungsvorbereitung.

---

*Erstellt von Doğu Bey — Buzzard Intelligence. Nur öffentliche Quellen.*