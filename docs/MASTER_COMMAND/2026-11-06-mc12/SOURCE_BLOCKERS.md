# Source blockers (rechecked, TLS on)

- **HU** https://nmhh.hu/posta/nyilvantartas HTTP 200 TLS VERIFIED → BLOCKED. Rechecked 2026-11-06 12:00 Europe/Berlin. Excel mentioned; still no xlsx/csv href.
- **PT** https://www.anacom.pt/render.jsp?categoryId=278775 HTTP 403 TLS VERIFIED → BLOCKED. Alphabetical list still HTTP 403. Login not attempted.
- **LT** https://rrt.lt/veiklos-sritys/pastas/pasto-paslauga/pasto-paslaugu-teikejai HTTP 200 TLS VERIFIED → BLOCKED. Power BI embed still present. Bulk export not performed.
- **RO** https://www.ancom.ro/reglementare-ro/servicii-postale/furnizori-servicii-postale/furnizori-servicii-postale-autorizati/ HTTP null TLS CERTIFICATE_VERIFY_FAILED → BLOCKED. TLS verify still fails. Certificate checks not disabled.
- **AT** https://data.rtr.at/pages/open-data/pt-agg HTTP 200 TLS VERIFIED → BLOCKED. §25 Anzeige/open-data frontend is a SPA shell; full operator table not bulk-extracted. PEV 16 names remain the sourced named set.
- **PL** https://www.uke.gov.pl HTTP undefined TLS n/a → NOT_RE_PAGED. UKE 234 B-numbers from prior ingest kept. Remaining pages not fetched this run. B-number ≠ parcel-service proof.
- **EL**  HTTP undefined TLS n/a → CLASSIFICATION_ONLY. EETT POST_* rows remain REGISTER_ONLY / postal licence. Not last-mile verified.
- **NL**  HTTP undefined TLS n/a → CLASSIFICATION_ONLY. ACM postvervoer vs pakketbezorgdienst split retained. Packet register class is not parcel-service verification.
