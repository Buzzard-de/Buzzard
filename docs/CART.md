# Cart (Storefront — Part 9)

## UI

- Route: `/warenkorb/`
- Component: `components/CartView.tsx`
- State: `lib/cart.tsx` (`CartProvider`)

## Commerce mode

When `NEXT_PUBLIC_COMMERCE_CORE=1`:

- Cart ID stored in `localStorage` (`buzzard_commerce_cart_id`)
- Session ID in `sessionStorage` (`buzzard_commerce_session`)
- All mutations go to `/api/commerce/cart/*`
- Totals use server `subtotal` + client shipping/tax estimate until checkout validate

## API

| Method | Path |
|--------|------|
| POST | `/api/commerce/cart` |
| GET | `/api/commerce/cart/:id` |
| POST | `/api/commerce/cart/:id/items` |
| PATCH | `/api/commerce/cart/:id/items/:itemId` |
| DELETE | `/api/commerce/cart/:id/items/:itemId` |
| POST | `/api/commerce/cart/:id/clear` |
| POST | `/api/commerce/cart/:id/validate` |

## Validation

Server validates: product exists, visible, purchasable, quantity, authoritative price, stock (dry-run).

Client must not send trusted prices.

## Ownership

Pass `customerId` when logged in. IDOR guard blocks cross-customer access.
