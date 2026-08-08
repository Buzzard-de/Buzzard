# BUZZARD — CURSOR PACKAGE 02
# PRODUCT CATALOG / PRODUCT DATA ENGINE

Use `buzzard_product_schema.json` as the product-data specification.

## 1. SOURCE OF TRUTH
Products must be data-driven. Never hard-code the permanent catalog inside React/HTML components.
Category IDs must reference Package 01 (`buzzard_categories.json`).

## 2. PRODUCT IDENTITY
Every product supports:
- internal product ID
- Buzzard SKU
- EAN/GTIN when available
- brand
- name
- primary category
- additional categories

## 3. PRODUCT PAGE
Implement:
- responsive image gallery and zoom
- product name, brand, SKU/EAN
- price and VAT information
- stock status
- variants
- quantity selector
- Add to Cart
- Buy Now where enabled
- shipping information
- description
- technical specifications
- documents
- related products
- frequently bought together
- reviews area
- trust/returns/payment information

## 4. VARIANTS
Support size, color, pack quantity, model, vehicle compatibility and future custom variant types through one reusable data model.

## 5. SUPPLIER DATA
Supplier ID, supplier SKU, purchase price and supplier-feed information belong to the private/admin layer.
Never expose supplier purchase prices to customers.
Prepare for API, XML, CSV, dropshipping, white-label and marketplace integrations.

## 6. INVENTORY
Support: in_stock, low_stock, out_of_stock, preorder.
Inventory must be independent from UI.

## 7. PRICING
Support sale price, compare-at price, VAT, future promotions and future B2B pricing. Default currency EUR.

## 8. SEARCH & FILTERS
Search by name, SKU, EAN/GTIN, brand, category and attributes.
Filters must be category-aware.
Automotive must be ready for future TecDoc/vehicle-fitment data.

## 9. SEO
Every active product needs stable slug, SEO title, meta description, canonical URL and appropriate product structured data.
Do not rely on database IDs as public URLs.

## 10. MULTILINGUAL
Do not hard-code one language into product components. Prepare names, descriptions, attributes and SEO fields for localization. Arabic must be supported.

## 11. RESPONSIVE
Optimize separately for desktop, laptop, tablet and smartphone while keeping one unified website.

## 12. PERFORMANCE
Use image lazy loading, optimized media, pagination/infinite loading, caching where appropriate and efficient filtering. Do not load the entire catalog into the browser.

## 13. ACCEPTANCE TEST
Create one test product, assign a real category ID, open its product page, test image gallery, price, stock, Add to Cart, variants, SEO URL, search by name/SKU, supplier-price privacy, mobile layout and console errors.

## 14. CRITICAL
Demo products are for testing only. The final system must scale to thousands or millions of products without rebuilding the frontend.
