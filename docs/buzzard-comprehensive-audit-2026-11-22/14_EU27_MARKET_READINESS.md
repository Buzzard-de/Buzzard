# EU-27 market readiness

Date: 22 November 2026. Source: `data/buzzard_europe_countries.json`, `data/buzzard_europe_shipping.json`, `data/calendar/ab27_national_days.v1.json`.

All 27 member-state codes are present. Each has a VAT rate, a currency, and a language code in the country file.

| Field | Configured | Missing |
|---|---|---|
| VAT rate | All 27 | Live tax filing. `TAX_CONNECT_LIVE` stays blocked. |
| Currency | All 27 | A live FX feed was not called. |
| Language code | All 27 | Reviewed catalog copy. See the language report. |
| Payment methods by country | None | Only global provider names exist. |
| Shipping prices | Explicit blocks for DE, FR, NL, PL | The other 23 use `DEFAULT`. |
| National day | One sourced day for each of 27 | A full legal holiday calendar. |
| Sanctions | Fail-closed local screen | A live list. |

STATUS: PARTIAL for configuration. BLOCKED_EXTERNAL for tax filing, live shipping rates, and live payments. HUMAN_REVIEW_REQUIRED for treating any VAT row as legal advice.

RISK LEVEL: P1 before a cross-border sale. P3 while sales are locked.
RECOMMENDED ACTION: Keep one country table. Do not invent payment methods per state.
CONFIDENCE: High for the file counts. Low for operational readiness of any member state.
