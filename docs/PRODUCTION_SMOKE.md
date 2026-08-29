# Production Smoke Tests (Part 13)

## Command

```bash
BUZZARD_API_URL=https://buzzard-api.onrender.com npm run test:production-smoke
```

Optional:

```bash
BUZZARD_EXPECTED_GIT_COMMIT=<sha> npm run test:production-smoke
REQUIRE_PERSISTENT_DB=1 npm run test:production-smoke
```

## What it checks

1. API reachable
2. Version / deployment identity + drift
3. Health summary (SALES=0)
4. DB health + persistence metadata
5. Security health (global RBAC)
6. Production health aggregate
7. Worker health (supplier blocked)
8. Catalog health
9. Public catalog products
10. 53 L1 categories
11. Commerce status SALES=0
12. Commercial checkout blocked
13. Admin auth required
14. Price tampering blocked
15. Legacy deprecation headers

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | All checks passed |
| 1 | Failures (security/commerce regression) |
| 2 | BLOCKED — stale deployment or missing endpoints |

## Safety

- No real payments
- No supplier orders
- No commercial orders
- Read-only + blocked-action probes only

## Local equivalent

```bash
BUZZARD_API_URL=http://localhost:3001 npm run test:production-smoke
```
