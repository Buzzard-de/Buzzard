# BUZZARD — CURSOR IMPLEMENTATION INSTRUCTIONS

## 1. Source of truth
Use `buzzard_categories.json` as the single source of truth for the navigation/category tree.
Do NOT invent, remove, rename, reorder, or replace categories with sample/demo categories.

## 2. Desktop mega-menu
Build the previously agreed three-panel mega-menu:
- LEFT: all 41 main categories, vertically listed from top to bottom.
- CENTER: subcategories of the currently selected main category, displayed in clean parallel columns.
- RIGHT: featured products, popular products, campaigns, or promotions for the selected category.
The left column must never show only 3 sample categories.

## 3. Category behavior
- Every main category is clickable.
- Every subcategory is clickable.
- Architecture must support level 3 and level 4 children without redesigning the data model.
- Menu data must be rendered dynamically from the JSON/API/database, not hard-coded separately in multiple components.
- Active/hover/focus states must be accessible and obvious.
- Preserve menu order from `menu_order`.

## 4. Responsive behavior
The same website must automatically adapt to:
- desktop PC
- laptop
- tablet
- smartphone

Desktop: wide three-panel mega-menu.
Tablet: optimized two-panel/overlay behavior.
Mobile: full-screen category navigation with expandable accordion levels.
Do not create a separate unrelated mobile website.

## 5. Brand/UI direction
Buzzard uses a premium black-and-gold visual direction.
Keep the interface clean, modern, premium and trustworthy.
Use the Buzzard logo prominently in the header.
Avoid clutter and excessive decorative effects.

## 6. Routing / SEO
Each category must have a stable slug and URL from the JSON source.
Do not create random URLs.
Keep URLs lowercase, ASCII-friendly, readable and stable.
Category pages should be indexable and have unique metadata generated from category data.

## 7. Engineering requirements
- Componentize the navigation.
- Use one category service/data layer.
- Do not duplicate the category tree in React/HTML components.
- Add TypeScript types/interfaces for Category.
- Add loading, empty and error states.
- Ensure keyboard navigation and ARIA labels for the mega-menu.
- Do not break existing cart, search, product, checkout or language functionality.
- Keep the code production-ready.

## 8. Multilingual architecture
Do not hard-code Turkish strings into the UI component.
Use category IDs as stable identifiers and provide localized names through a translation layer.
The site is planned as multilingual and must support Arabic as one of the initial languages.

## 9. Vehicle selector
The automotive category must remain compatible with a future TecDoc/vehicle-fitment integration.
Do not couple the general category system to automotive-specific logic.

## 10. Acceptance test
Before declaring the work complete:
1. Verify exactly 41 main categories are loaded.
2. Verify all 41 appear in the desktop left column.
3. Click every main category and verify its subcategories change correctly.
4. Verify every displayed category has a working route.
5. Verify no demo categories remain.
6. Verify mobile/tablet navigation works.
7. Verify keyboard navigation works.
8. Verify refresh/deep-linking on category URLs works.
9. Verify no console errors.
10. Verify the category tree is loaded from the single source of truth.

## 11. Important
Do not simplify the project by showing only the first 3 categories.
Do not replace the supplied category database with placeholder data.
Do not ask the user to manually enter categories into the UI.
Implement the data-driven architecture so future categories/products can be added without rebuilding the menu.
