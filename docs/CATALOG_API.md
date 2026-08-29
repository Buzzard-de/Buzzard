# Catalog API (Part 7)

Public read-only endpoints (via `storefrontBridgePlugin.js`):

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/catalog/health` | Bridge health, cache, sync summary |
| GET | `/api/catalog/products` | Paginated product list |
| GET | `/api/catalog/products/:id` | Product by ID |
| GET | `/api/catalog/products/slug/:slug` | Product by SEO slug |
| GET | `/api/catalog/categories` | Visible main categories |
| GET | `/api/catalog/categories/:id` | Category detail |
| GET | `/api/catalog/categories/:id/children` | Subcategories |
| GET | `/api/catalog/brands` | Brands with public products |
| GET | `/api/catalog/search` | Search (paginated) |

## Query parameters (products/search)

| Param | Description |
|-------|-------------|
| `q` | Search term (title, SKU, EAN, GTIN, MPN, brand) |
| `category` | Category id or slug |
| `page` | Page number (default 1) |
| `limit` | Page size (max 100) |
| `sort` | `relevance`, `price-asc`, `price-desc`, `newest`, `name-asc` |
| `brand` | Brand slug filter |
| `minPrice`, `maxPrice` | Price range |
| `inStock` | `1` for in-stock only |

## Response shape (products)

```json
{
  "success": true,
  "items": [...],
  "total": 42,
  "page": 1,
  "pageSize": 24,
  "totalPages": 2,
  "facets": { "brands": [], "priceRange": {}, "inStockCount": 0 },
  "catalogMode": true
}
```

## Admin endpoints

| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/admin/storefront/health` | system.read |
| GET | `/api/admin/storefront/preview/products` | products.read |
| POST | `/api/admin/storefront/sync` | sync.run |

## Security

- Rate limiting via existing API middleware
- No authentication required for public GET routes
- Admin data never included in public product DTO
