# Construction Machinery Search & Compatibility Engine

Scoped module. Does not replace `data/buzzard_categories.json`. Shop L1 remains `cat-55`.

## Status

| Capability | Status |
|---|---|
| Domain model, taxonomy, compatibility, search, sourcing | CODE_READY |
| Local mock connector | CODE_READY (fixture only) |
| REST/GraphQL/SOAP/CSV/SFTP/EDI/webhook adapters | NOT_CONFIGURED stubs |
| Live manufacturer/supplier integration | NOT_IMPLEMENTED |
| Visual/IPC structured extraction | NOT_IMPLEMENTED (documents stored unstructured) |
| Sales / payments / purchases | untouched, fail-closed |

## Evidence rules

- `VERIFIED_COMPATIBLE`: authorized manufacturer catalog or approved technical source, matching identity, no exclusion. Technical similarity or AI never suffice.
- `CONDITIONALLY_COMPATIBLE`: approved evidence with year/serial/revision/position boundaries.
- `POSSIBLE_ALTERNATIVE`: supersession or alternative without machine-specific proof.
- `VERIFIED_INCOMPATIBLE`: explicit exclusion.
- `INSUFFICIENT_DATA`: missing evidence or required serial/configuration.

## Continue

```bash
npx vitest run server/__tests__/constructionMachinery.test.mjs
```

Admin mock import: `POST /api/admin/construction-machinery/import` `{ "connectorId": "mock-local" }` with admin auth.
Public search: `GET /api/construction-machinery/search`.
Storefront: `/baumaschinen-suche/`.
