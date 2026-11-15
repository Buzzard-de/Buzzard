# Source blockers

- **HU** https://nmhh.hu/posta/nyilvantartas — HTTP 200 TLS VERIFIED → BLOCKED. Page advertises Excel; no xlsx/csv href in fetched HTML. Locker/PUDO stay off the carrier count.
- **PT** https://www.anacom.pt/render.jsp?categoryId=278775 — HTTP 403 TLS VERIFIED → BLOCKED. Alphabetical list HTTP 403. Login not attempted. 15 named titles from v4/v6 preserved.
- **PT** https://www.anacom.pt/render.jsp?categoryId=1738 — HTTP null TLS TIMEOUT_OR_UNREACHABLE → BLOCKED. Prestadores registados timed out. Search snippets are not a complete census and were not ingested as new entities.
- **LT** https://rrt.lt/veiklos-sritys/pastas/pasto-paslauga/pasto-paslaugu-teikejai — HTTP 200 TLS VERIFIED → BLOCKED. Public page still embeds Power BI. Bulk export not performed. data.gov.lt dataset 2727 returned HTTP 500.
- **RO** https://www.ancom.ro/reglementare-ro/servicii-postale/furnizori-servicii-postale/furnizori-servicii-postale-autorizati/ — HTTP null TLS CERTIFICATE_VERIFY_FAILED → BLOCKED. Did not disable TLS. First-page names from prior research kept. Not a full register.
- **HR** https://www.hakom.hr/hr/davatelji-usluga/288 — HTTP 200 TLS VERIFIED → CONFIRMED_UNCHANGED. Page still states 24 providers (1 UU+ZPU+OPU, 3 ZPU, 2 ZPU+OPU, 18 OPU). Unique legal names remain 22. Not all parcel last-mile.
- **AT** https://www.rtr.at/TKP/was_wir_tun/post/betreiberservice/liste_der_pev-betreiber.de.html — HTTP 200 TLS VERIFIED → CONFIRMED_UNCHANGED. PEV list Stand 16. Februar 2026 still 16 names. Not the full §25 Anzeige list. 138 unused.

TLS was not disabled. 403/login were not bypassed. Egress allowlist was not expanded.
