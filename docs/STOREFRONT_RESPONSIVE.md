# Storefront Responsive (Part 7)

## Goals

- No horizontal page overflow on mobile
- Product cards responsive across breakpoints
- Long product names do not break layout

## CSS

Primary file: `styles/storefront-responsive.css`

### Product card fixes

- `-webkit-line-clamp: 2` on `.product-card-name`
- `min-width: 0` on card body and grid cells
- Flex-wrap on `.product-card-actions`
- `overflow-x: clip` on page containers

## Breakpoints tested

| Width | Grid columns |
|-------|--------------|
| 320–480px | 2 |
| 481–768px | 2 |
| 769–1024px | 3 |
| 1025px+ | 4 |

## Component changes

- Shared `components/ProductCard.tsx` for consistent layout
- `ProductList.tsx` uses ProductCard + PIM API pagination

## Category navigation UX

- **No auto-expand**: subcategories hidden until customer clicks main category
- `CategorySidebar`: accordion expands one branch at a time on click
- `MegaMenuOverlay`: placeholder until main category selected
- `MegaMenu`: L3 sub-subcategories only when L2 subcategory active

## E2E checks

- `e2e/storefront-bridge.spec.ts` — overflow at 320px/375px, mega menu click behavior

## Manual verification

```bash
# Resize browser or use DevTools device toolbar at:
320, 360, 375, 390, 414, 480, 768, 1024, 1280, 1440, 1920
```

Confirm: no horizontal scrollbar on `document.documentElement`.
