# OpenSearch Foundation (Part 8)

## Abstraction

`server/lib/commerce/productSearchAbstraction.js`

```
Current SQL/PIM search
       ↓
productSearchAbstraction
       ↓
Future OpenSearch adapter (when BUZZARD_OPENSEARCH_ENABLED=1)
```

## Behavior

- Default backend: `sql` (existing PIM + catalog read)
- When OpenSearch URL configured but not deployed: stub with SQL fallback
- Storefront search continues working without OpenSearch

## Env

- `BUZZARD_OPENSEARCH_URL` — optional
- `BUZZARD_OPENSEARCH_ENABLED=1` — enable adapter (not required for Part 8)
