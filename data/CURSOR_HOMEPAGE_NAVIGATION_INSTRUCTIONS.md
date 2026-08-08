# BUZZARD — CURSOR PACKAGE 03
# HOMEPAGE + HEADER + THREE-PANEL MEGA MENU

This package defines the main visual/navigation shell of Buzzard.

## 1. ABSOLUTE SOURCE RULE
Use Package 01 `buzzard_categories.json` for all category navigation.
Use Package 02 product data for products.
Never create a separate hard-coded category list in the frontend.
Never show only 3 demo categories.

## 2. HEADER
Build a premium responsive header with:
- Buzzard logo
- All Categories / mega-menu trigger
- prominent search field
- account/login
- wishlist
- cart
- language selector
- country-aware experience
- optional promotional/top utility bar

The header must remain usable on every device.

## 3. THREE-PANEL MEGA MENU
Desktop:
LEFT PANEL:
- show all 41 main categories
- exact order from `menu_order`
- vertically scrollable if needed
- selected category highlighted
- every category clickable

CENTER PANEL:
- display subcategories of selected category
- use 3–4 clean parallel columns where space allows
- group related subcategories logically
- every item clickable

RIGHT PANEL:
- featured products
- popular products
- campaign banners
- category promotion
- optional brand highlight

The right panel must be data-driven and must not break if no promotion exists.

## 4. MEGA MENU BEHAVIOR
- Opening/closing must be smooth but fast.
- Mouse hover may preview categories on desktop.
- Keyboard navigation must work.
- Escape closes the menu.
- Focus must remain accessible.
- Clicking outside closes it.
- Do not navigate accidentally when merely hovering.
- Main category click opens its category page.
- Subcategory click opens its subcategory page.

## 5. MOBILE
Do NOT shrink the desktop mega menu.
Create a dedicated mobile interaction inside the same website:
- full-screen or near-full-screen menu
- main categories as accordion rows
- expandable subcategories
- back navigation
- search
- account/cart access
- language selection

All levels must remain accessible.

## 6. TABLET
Use a responsive overlay/two-panel approach where appropriate.
Do not allow the menu to overflow outside the viewport.

## 7. HOMEPAGE
Create a premium homepage with these sections in this general order:

1. Hero / primary campaign
2. Category discovery
3. Featured products
4. Best sellers
5. Promotional campaigns
6. Selected category highlights
7. Brand/quality/trust area
8. Reviews or social proof
9. Newsletter
10. Footer

Sections must be modular and reorderable.

## 8. HERO
The hero must support:
- headline
- short message
- CTA button
- image/banner
- campaign link
- optional secondary CTA

Do not permanently hard-code campaign text into the component.

## 9. CATEGORY DISCOVERY
Use category data to create attractive category cards/tiles.
Prioritize important categories without deleting the remaining categories.
Provide a clear path to “Alle Kategorien”.

## 10. PRODUCT SECTIONS
Featured products and best sellers must come from product data.
Do not permanently hard-code demo products.
Product cards should support:
- image
- brand
- product name
- price
- compare-at price when available
- stock indicator when appropriate
- rating/review count
- wishlist
- quick add to cart where appropriate

## 11. VISUAL STYLE
Buzzard direction:
- black and gold premium identity
- clean, modern layout
- strong typography
- generous spacing
- high-quality product imagery
- subtle animations only
- no excessive gradients or visual clutter

The result should feel like a serious German/European e-commerce company.

## 12. MULTILINGUAL
Include language selection.
Architecture must support German, Turkish and Arabic and be expandable to additional languages.
Do not hard-code translated text into reusable components.
Respect RTL layout for Arabic.

## 13. COUNTRY / LANGUAGE
Prepare the site to detect browser language/country and suggest or select the appropriate language, while always allowing the user to change it manually.

## 14. RESPONSIVE
One unified website, optimized for:
- desktop PC
- laptop
- tablet
- smartphone

Check every major component at common breakpoints.

## 15. PERFORMANCE
- optimized responsive images
- lazy loading below the fold
- avoid loading all product data at once
- keep mega-menu fast
- avoid unnecessary animation
- prevent layout shift

## 16. ACCESSIBILITY
- semantic navigation
- keyboard support
- visible focus states
- ARIA labels where needed
- sufficient contrast
- screen-reader friendly menu structure

## 17. ACCEPTANCE TEST
Before completion:
1. Header renders correctly.
2. All 41 main categories appear in desktop mega menu.
3. Selecting each main category loads the correct subcategories.
4. Center panel supports multiple columns.
5. Right promotional panel works with and without content.
6. Every menu item has a valid route.
7. Mobile accordion works.
8. Tablet navigation works.
9. Language selector works.
10. Arabic RTL layout is structurally supported.
11. Homepage product sections use real product data sources.
12. No permanent demo category list remains.
13. No console errors.
14. No horizontal overflow on mobile.

## 18. DO NOT SIMPLIFY
Do not replace the three-panel architecture with a basic dropdown.
Do not reduce the 41 categories to sample categories.
Do not create a separate unrelated mobile website.
Do not hard-code the category tree into UI components.
