# Vehicle Parts Intelligence & Sourcing

Internal automotive/commercial/motorcycle parts engine. Isolated from agricultural (`cat-20`) and construction (`cat-55`). Shop L1 remains `cat-05`.

- Status: CODE_READY against local mock fixtures. TecDoc stays MOCK. No licensed OEM catalog is LIVE_VERIFIED.
- VIN: hashed/WMI/last6 only. Decoder is not authoritative. Full VIN is not persisted or logged.
- Connectors: `mock-vpe-local` plus interface stubs. REST/SOAP/EDI adapters are NOT_CONFIGURED.
- Pricing: `server/lib/pricing.js` via `machineryDomainKit/pricingContract`. Minimum net profit EUR 0.50. No purchases.
- Sales flags are never enabled by this module.
