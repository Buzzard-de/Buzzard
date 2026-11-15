# API and sandbox

Existing engine apiLevel 0–7 is unchanged so v6 tests keep DHL/GLS/UPS at **LEVEL 2**.

MC11 maturity 0–5 is a parallel field:

- DHL Parcel (DE): apiLevel 2, mc11Maturity 3 (https://developer.dhl.com/api-reference/parcel-de-shipping-post-parcel-germany-v2), sandboxVerified=false
- GLS (MULTI): apiLevel 2, mc11Maturity 3 (https://shipit.gls-group.com/documentation/webservices/5_2_5/WS-REST-API/rest_web_service_requests_samples.html), sandboxVerified=false
- UPS (MULTI): apiLevel 2, mc11Maturity 3 (https://developer.ups.com/api/reference/shipping), sandboxVerified=false
- PostNL (NL): apiLevel 2, mc11Maturity 1 (https://developer.postnl.nl/docs/), sandboxVerified=false
- La Poste (FR): apiLevel 2, mc11Maturity 1 (https://developer.laposte.fr/), sandboxVerified=false
- Correos (ES): apiLevel 2, mc11Maturity 1 (https://www.correos.es/es/en/companies/e-commerce/reinforce-your-ecommerce-logistics/api-integration), sandboxVerified=false
- bpost (BE): apiLevel 2, mc11Maturity 1 (https://bpost.freshdesk.com/support/home), sandboxVerified=false

No LEVEL 4/5. No secrets stored.
