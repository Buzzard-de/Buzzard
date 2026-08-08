# BUZZARD — CURSOR PACKAGE 10
# ADMIN DASHBOARD + SALES ANALYTICS + FINANCE + OPERATIONS

## 1. PURPOSE
Build the central Buzzard business dashboard for administrators and authorized staff.

Dependencies:
- Packages 01–09

The dashboard must provide a clear overview of sales, orders, products, customers, suppliers, inventory, fulfillment and financial performance.

## 2. ADMIN DASHBOARD
Create a premium, responsive dashboard with configurable KPI cards:
- revenue
- orders
- average order value
- products sold
- new customers
- conversion rate where data is available
- refunds
- shipping cost
- estimated gross profit
- stock alerts

Do not present estimated metrics as exact financial accounting unless the underlying data supports it.

## 3. TIME FILTERS
Support:
- today
- yesterday
- last 7 days
- last 30 days
- month to date
- previous month
- year to date
- custom date range

All metrics must use consistent timezone handling.

## 4. SALES ANALYTICS
Provide:
- revenue trend
- order trend
- units sold
- average order value
- top products
- top categories
- top brands
- top customers where appropriate
- sales by country
- sales by language/market where meaningful

Use server-side aggregation for large datasets.

## 5. PRODUCT ANALYTICS
Show:
- best sellers
- slow movers
- products with low stock
- out-of-stock products
- products with high return rates
- products with strong margin potential
- product/category performance

Do not expose supplier purchase prices to unauthorized roles.

## 6. CATEGORY ANALYTICS
Use the Buzzard category master from Package 01.
Allow drilling:
Main category → subcategory → products

Do not create a second category taxonomy for analytics.

## 7. CUSTOMER ANALYTICS
Support:
- new vs returning customers
- customer order frequency
- average customer value
- geographic distribution
- account creation trend

Respect privacy and role permissions.

## 8. ORDER OPERATIONS
Admin should be able to:
- search orders
- filter by status
- filter by date
- view order details
- inspect payment status
- inspect fulfillment status
- view shipments
- handle exceptions
- access return/refund workflow where permitted

## 9. INVENTORY DASHBOARD
Show:
- current stock
- low stock
- out of stock
- incoming stock where available
- supplier stock status
- inventory sync errors

Provide configurable low-stock thresholds.

## 10. SUPPLIER PERFORMANCE
Authorized staff can view:
- supplier order count
- fulfillment success rate
- average fulfillment time
- failed supplier orders
- stock reliability where measurable
- sync errors
- supplier-related returns

Supplier purchase prices and sensitive commercial information must be role-protected.

## 11. FINANCIAL VIEW
Create operational financial reporting for:
- gross sales
- discounts
- refunds
- shipping revenue
- shipping cost
- supplier cost where authorized
- estimated gross margin
- estimated contribution margin where data permits

Clearly distinguish:
- revenue
- costs
- estimated profit
- accounting data

Do not claim that an operational dashboard replaces German statutory accounting.

## 12. EXPORTS
Prepare exports for:
- CSV
- Excel-compatible data
- JSON where useful

Exports must respect user permissions and must not leak sensitive supplier/customer data.

## 13. REPORTING
Create report views for:
- daily sales
- weekly sales
- monthly sales
- category performance
- product performance
- customer performance
- supplier performance
- inventory
- returns

## 14. VISUALIZATION
Use clean charts:
- line charts for trends
- bar charts for comparisons
- tables for detailed records
- KPI cards for headline metrics

Avoid decorative charts that do not communicate useful information.

## 15. RESPONSIVE
Admin dashboard must work on:
- desktop
- laptop
- tablet
- smartphone

Desktop can use multiple columns.
Mobile should stack KPI cards and use scrollable tables/cards where necessary.

## 16. ROLE-BASED ACCESS
Respect Package 07 roles:
- administrator
- catalog_manager
- order_manager
- read_only

Examples:
- catalog_manager: product/catalog/inventory views
- order_manager: orders/fulfillment/returns
- read_only: view permitted reports without modification
- administrator: full access

Sensitive financial and supplier information must require explicit permission.

## 17. PERFORMANCE
For large datasets:
- server-side aggregation
- pagination
- indexed queries
- caching where useful
- date-range limits for expensive reports
- background jobs for heavy exports

Do not load millions of order records into the browser.

## 18. AUDIT
Important admin actions must use the audit system from Package 07.

Record:
- actor
- action
- resource
- timestamp
- relevant context

## 19. MULTILINGUAL
Admin UI should be localization-ready.
Customer-facing reports and exported customer communication should use the relevant language where applicable.
Support Arabic RTL in the admin interface if Arabic is selected.

## 20. ACCEPTANCE TEST
Before completion:
1. Open admin dashboard.
2. Verify KPI calculations.
3. Test every time filter.
4. Open sales trend.
5. Drill into category.
6. Drill into product.
7. View customer analytics with correct permissions.
8. View inventory alerts.
9. View supplier performance with authorized role.
10. Test order filters.
11. Test financial view.
12. Test CSV/Excel-compatible export.
13. Verify role restrictions.
14. Verify sensitive supplier/customer data is protected.
15. Test mobile dashboard.
16. Test Arabic RTL.
17. Confirm no console errors.

## 21. CRITICAL
Analytics must use real database/order/product data once connected.
Do not permanently use hard-coded numbers.
Do not present fake revenue or profit figures as real business data.
