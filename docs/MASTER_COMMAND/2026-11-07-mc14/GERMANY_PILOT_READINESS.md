# Germany pilot readiness

Pilot country: **DE**. Sales and live shipment: **off**.

Recommended first sandbox **after** contract: **dhl-parcel-de**.

## Function status

- addressValidation: **MOCK_READY**
- postcodeCoverage: **SHAPE_ONLY_COVERAGE_UNKNOWN**
- carrierCompare: **MOCK_READY**
- rateQuote: **CODE_READY_MOCK**
- createShipment: **CODE_READY_MOCK**
- label: **CODE_READY_MOCK**
- tracking: **MOCK_READY**
- pickup: **CODE_READY_MOCK**
- returns: **MOCK_READY**
- fallback: **MOCK_READY**
- customerNotify: **CODE_READY_NO_LIVE_SEND**
- performanceReport: **STRUCTURE_UNKNOWN_METRICS**

## Carriers

- **DHL Parcel Germany** (`dhl-parcel-de`) docs=https://developer.dhl.com/api-reference/parcel-de-shipping-post-parcel-germany-v2 MOCK_TESTED=true SANDBOX_READY=false LIVE_AUTHORIZED=false postcode=UNKNOWN
- **GLS** (`gls-shipit`) docs=https://shipit.gls-group.com/documentation/webservices/5_2_5/WS-REST-API/rest_web_service_requests_samples.html MOCK_TESTED=true SANDBOX_READY=false LIVE_AUTHORIZED=false postcode=UNKNOWN
- **UPS** (`ups-developer`) docs=https://developer.ups.com/api/reference/shipping MOCK_TESTED=true SANDBOX_READY=false LIVE_AUTHORIZED=false postcode=UNKNOWN
- **DPD** (`dpd-esolutions`) docs=https://esolutions.dpd.com/entwickler/dpdwebservices/dokumentationen.aspx MOCK_TESTED=false SANDBOX_READY=false LIVE_AUTHORIZED=false postcode=UNKNOWN
- **Hermes Germany** (`hermes-germany-hsi`) docs=https://de-api.hermesworld.com/docs/ MOCK_TESTED=false SANDBOX_READY=false LIVE_AUTHORIZED=false postcode=UNKNOWN

Regional/local independently parcel-verified for DE this command: **0**.

## Commercial prep (no application filed)

Volume minima, Gründerkonto, fuel surcharge tables, return price lists, contract term, termination, insurance, and payment terms: **UNKNOWN** for DHL, GLS, UPS, and DPD — not guessed.

Publicly sourced only:

| Brand | API access | Application by agent |
| --- | --- | --- |
| DHL Parcel Germany | CONTRACT_REQUIRED (developer.dhl.com) | false |
| GLS | CONTRACT_REQUIRED (ShipIT) | false |
| UPS | CONTRACT_REQUIRED (developer.ups.com) | false |
| DPD | CONTRACT_REQUIRED (eSolutions) | false |
| Hermes Germany | BUSINESS_CUSTOMER_OR_SOFTWARE_PARTNER; test logins via supervised IT project | false |

## Missing for first real integration

1. Business customer / developer contract (user, not agent).
2. Sandbox credentials issued by the carrier.
3. Signed commercial terms (UNKNOWN volume/minimums — not guessed).
4. Postcode coverage file for DE (GISCO/Deutsche Post licensed ingest not completed).
5. Human approval gate before any live label.
