# BUZZARD — CURSOR PACKAGE 03
# HOMEPAGE + HEADER + MEGA MENU + SEARCH + MOBILE NAVIGATION

## 1. PURPOSE
Implement the main customer-facing navigation and homepage architecture for Buzzard.
Use Package 01 category data as the single source of truth and Package 02 product data for product content.

## 2. HEADER
Create a premium, responsive header with:
- Buzzard logo
- All Categories / Mega Menu trigger
- large search field
- account area
- wishlist
- cart
- language selector
- customer/trust messaging where appropriate

The header must remain clean and usable on desktop, tablet and smartphone.

## 3. DESKTOP MEGA MENU
Use the agreed three-panel architecture:

LEFT PANEL:
- show ALL 41 main categories
- preserve exact menu order from Package 01
- never show only 3 demo categories

CENTER PANEL:
- show subcategories for the selected main category
- organize them into clean parallel columns
- all items clickable

RIGHT PANEL:
- featured products
- popular products
- promotions/campaigns
- category image or merchandising content

The menu must be data-driven, not manually duplicated in components.

## 4. INTERACTION
- Hover/focus/click on a main category updates the center and right panels.
- Clicking a main category opens its category page.
- Clicking a subcategory opens its subcategory page.
- ESC closes the menu.
- Keyboard navigation must work.
- Clicking outside closes the overlay where appropriate.
- Do not trap the user in the menu.

## 5. MOBILE
On smartphone:
- use a full-screen navigation drawer/overlay
- show all 41 main categories
- expandable accordion levels
- clear back/close controls
- search must remain easy to access
- cart and account must remain accessible

Do not simply shrink the desktop mega menu.

## 6. TABLET
Use an optimized overlay/two-panel experience suitable for touch.
Maintain the complete category tree.

## 7. HOMEPAGE
Build a premium Buzzard homepage with:
1. Header
2. Hero section
3. Featured categories
4. Popular products
5. Deals/promotions
6. New arrivals
7. Recommended products
8. Brand/trust section
9. Shipping/returns/payment trust indicators
10. Newsletter/marketing area
11. Footer

Sections must be reusable components and product/category driven.

## 8. SEARCH
Implement a prominent global search.
Search should support:
- product name
- SKU
- EAN/GTIN
- brand
- category
- relevant attributes

Provide:
- autocomplete/suggestions
- recent searches where appropriate
- clear empty state
- search results page
- filters
- sorting
- pagination or efficient infinite loading

## 9. VISUAL DIRECTION
Buzzard:
- premium black-and-gold direction
- modern
- clean
- trustworthy
- strong typography
- generous spacing
- high-quality product imagery
- avoid excessive animations

The design must feel like a serious German/European e-commerce brand, not a template/demo shop.

## 10. RESPONSIVE
The same website must adapt automatically to:
- desktop PC
- laptop
- tablet
- smartphone

Do not build separate unrelated websites.

## 11. MULTILINGUAL
Prepare the UI for multilingual operation.
The language selector must be visible and usable.
Architecture must support Arabic and RTL in addition to European languages.
Do not hard-code Turkish text into reusable UI components.

## 12. ACCESSIBILITY
Use:
- semantic HTML
- keyboard navigation
- visible focus states
- ARIA labels where needed
- sufficient contrast
- touch-friendly controls

## 13. PERFORMANCE
- optimize images
- lazy-load below-the-fold media
- avoid unnecessary JavaScript
- avoid loading the entire product catalog into the homepage
- use pagination/caching/data fetching appropriately

## 14. ACCEPTANCE TEST
Before declaring Package 03 complete:
1. Header works on desktop.
2. All 41 categories appear in the desktop mega menu.
3. Center panel changes correctly for every main category.
4. Right panel can display dynamic merchandising.
5. Every category route works.
6. Mobile navigation exposes all 41 categories.
7. Search works by product name and SKU.
8. Search results support filtering and sorting.
9. Cart/account/language controls remain usable.
10. Keyboard navigation works.
11. Arabic/RTL layout does not break the structure.
12. No console errors.
13. No placeholder three-category menu remains.

## 15. CRITICAL
Do not simplify the architecture to make development easier.
Do not replace the 41-category structure with sample data.
Do not hard-code navigation in multiple places.
Use the previously supplied JSON/database category source.
