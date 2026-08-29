# E2E Testing

## Stack bootstrap

Playwright uses `scripts/e2e-webserver.mjs` to start:

1. Buzzard API (`npm run dev:api`) on port **3001**
2. Next.js storefront (`npm run dev`) on port **3000**

Environment flags during E2E:

| Flag | Value |
|------|-------|
| `BUZZARD_SALES_ENABLED` | `0` |
| `NEXT_PUBLIC_COMMERCE_CORE` | `1` |
| `NEXT_PUBLIC_BUZZARD_API_URL` | `http://localhost:3001` |

## Specs

| File | Coverage |
|------|----------|
| `e2e/customer-journey.spec.ts` | Full browser journey + mobile viewports |
| `e2e/commerce-security.spec.ts` | Safety, IDOR, tampering, idempotency |
| `e2e/commerce-storefront.spec.ts` | Part 9 API + UI smoke |
| `e2e/admin.spec.ts` | Admin login / Control Center |

## Viewports

Desktop: 1280×720, 1440×900, 1920×1080  
Mobile: 320×844, 360×800, 375×812, 390×844, 414×896  
Tablet: 768×1024

## Commands

```bash
npm run test:e2e                              # Full stack + browser
PLAYWRIGHT_SKIP_WEBSERVER=1 npm run test:e2e    # Use already-running servers
npm run test:e2e:api                          # API scenarios only
```

## CI notes

Set `CI=1` to disable `reuseExistingServer`. Allow up to 180s for webserver startup.
