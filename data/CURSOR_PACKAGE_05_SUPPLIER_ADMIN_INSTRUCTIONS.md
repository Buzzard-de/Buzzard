# BUZZARD — CURSOR PACKAGE 05
# SUPPLIER INTEGRATION + IMPORTS + INVENTORY SYNC + ADMIN CATALOG

## 1. PURPOSE
Build the supplier and catalog-management foundation that connects Buzzard to B2B suppliers and keeps products, prices and stock synchronized.

Dependencies:
- Package 01 — Categories
- Package 02 — Product Catalog
- Package 03 — Homepage / Navigation
- Package 04 — Checkout / Orders

## 2. SUPPLIER MODEL
Create a private supplier model containing:
- supplier_id
- supplier_name
- contact information
- website/reference
- API endpoint where applicable
- feed type
- authentication configuration
- currency
- VAT handling
- shipping information
- dropshipping capability
- white-label/blind-shipping capability
- active/inactive status
- last synchronization time
- synchronization status

Supplier information must never appear on public product pages.

## 3. IMPORT METHODS
Prepare a common import pipeline for:
- REST API
- XML feed
- CSV
- JSON
- manual product import

Do not build separate unrelated import systems.
All imports should pass through a normalized product-processing layer.

## 4. PRODUCT MAPPING
Supplier products must be mapped to Buzzard products using:
- supplier SKU
- EAN/GTIN
- brand
- supplier category
- Buzzard category ID
- optional manual mapping rules

The system must prevent accidental duplicate products.

## 5. CATEGORY MAPPING
Supplier categories must NOT overwrite the Buzzard master category structure.

Instead:
Supplier category → mapping rule → Buzzard category ID

The 41 Buzzard main categories remain the master navigation structure.

## 6. PRICE SYNC
Support:
- supplier purchase price
- currency conversion layer
- configurable markup
- minimum margin rules
- sale price
- compare-at price
- future B2B pricing

Never expose supplier purchase price publicly.

Price calculations must be server-side.

## 7. STOCK SYNC
Synchronize:
- stock quantity
- stock status
- availability
- supplier lead time where available

Support configurable safety stock so Buzzard does not sell the last unavailable supplier unit accidentally.

## 8. PRODUCT CONTENT SYNC
Support supplier updates for:
- product name
- descriptions
- specifications
- EAN
- brand
- images
- documents
- dimensions
- weight

Buzzard-controlled fields must be protected from automatic overwrite when configured.

## 9. SYNC SCHEDULING
Architecture must support:
- manual sync
- scheduled sync
- full sync
- incremental sync

Store:
- started_at
- finished_at
- records read
- records created
- records updated
- records skipped
- records failed
- error log

## 10. ERROR HANDLING
A failed supplier record must not stop the entire import unless a critical system error occurs.

Create an import log with:
- supplier
- record reference
- error type
- error message
- timestamp
- retry status

Provide retry capability.

## 11. ADMIN CATALOG
Create an admin/catalog management area where authorized users can:
- create product
- edit product
- archive product
- activate/deactivate product
- edit price
- edit stock
- manage images
- assign categories
- manage variants
- manage SEO
- view supplier mapping
- view sync status

## 12. ADMIN SECURITY
Use role-based access.
At minimum prepare:
- administrator
- catalog manager
- order manager
- read-only

Supplier credentials and API secrets must never be exposed in frontend code.

## 13. DROPSHIPPING / WHITE LABEL
Prepare order forwarding architecture:
Buzzard order → supplier order request → supplier fulfillment → tracking update → customer order status.

Support future:
- blind shipping
- white-label packaging
- Buzzard branded inserts
- tracking number synchronization

Do not expose supplier identity to customers unless explicitly configured.

## 14. MARKETPLACE READINESS
The normalized product data should be reusable for future:
- eBay
- Amazon
- Google Shopping
- other marketplaces

Do not hard-code marketplace-specific fields into the core product model.

Use adapters/mappers.

## 15. AUTOMOTIVE / TECDOC READINESS
The automotive data layer must allow future TecDoc/vehicle-fitment integration without changing the general product architecture.

Vehicle compatibility must be stored as structured relations, not as random text only.

## 16. AUDIT LOG
Record important administrative changes:
- who changed it
- what changed
- old value
- new value
- timestamp

## 17. ACCEPTANCE TEST
Before completion:
1. Create a test supplier.
2. Import test products.
3. Map supplier categories to Buzzard categories.
4. Prevent duplicate products.
5. Update price.
6. Update stock.
7. Update images/content.
8. Record import logs.
9. Retry a failed record.
10. Verify supplier purchase price is private.
11. Verify API credentials are private.
12. Test scheduled sync architecture.
13. Test admin roles.
14. Test audit logs.
15. Verify no public page exposes supplier information.
16. Verify no console errors.

## 18. CRITICAL
Do not connect suppliers directly to frontend components.
Supplier integrations must go through the backend/data layer.
The Buzzard category master remains the authoritative category/navigation structure.
