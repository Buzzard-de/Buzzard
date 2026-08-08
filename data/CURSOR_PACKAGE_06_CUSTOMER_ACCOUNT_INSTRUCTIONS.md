# BUZZARD — CURSOR PACKAGE 06
# CUSTOMER ACCOUNT + ORDERS + WISHLIST + CUSTOMER DASHBOARD

## 1. PURPOSE
Build the complete customer account area for Buzzard.

Dependencies:
- Package 01 — Categories
- Package 02 — Product Catalog
- Package 03 — Homepage / Navigation
- Package 04 — Checkout / Orders
- Package 05 — Supplier/Admin

## 2. CUSTOMER ACCOUNT
Create:
- registration
- login
- logout
- password reset
- email verification architecture
- account dashboard
- profile
- addresses
- orders
- order detail
- wishlist
- saved preferences
- notification preferences

## 3. REGISTRATION
Registration must support:
- first name
- last name
- email
- password
- password confirmation
- country
- consent/legal confirmation as required

Validate fields server-side.
Never store plain-text passwords.

## 4. LOGIN
Support:
- email/password login
- secure session handling
- logout
- password reset
- account lock/rate-limit protection where appropriate

Do not expose authentication secrets in frontend code.

## 5. CUSTOMER DASHBOARD
Create a premium dashboard showing:
- welcome area
- recent orders
- order status
- saved addresses
- wishlist count
- account shortcuts
- support/contact shortcut

Keep the dashboard simple and mobile friendly.

## 6. ORDERS
Customers can:
- view all orders
- open order detail
- see order number
- see products
- see quantities
- see prices
- see VAT
- see shipping
- see total
- see payment status
- see fulfillment status
- see tracking information when available

Order information must come from the server.

## 7. ORDER STATUS
Support:
- pending
- payment_pending
- paid
- processing
- shipped
- delivered
- cancelled
- refunded

Customer-facing labels should be localized and user friendly.

## 8. ADDRESSES
Customers can:
- add address
- edit address
- delete address
- set default shipping address
- set default billing address

Support German/EU address structures while keeping the data model country-neutral.

## 9. WISHLIST
Wishlist must support:
- add/remove product
- product image
- product name
- price
- stock status
- open product
- move to cart where available

Do not store an entire product object in the wishlist.
Store stable product IDs and retrieve current product data.

## 10. PRIVACY & SECURITY
Important:
- password hashing
- secure sessions/tokens
- server-side authorization
- users can only access their own account/order data
- rate limiting for sensitive actions
- no sensitive customer information in public API responses
- no payment card storage
- secure password reset tokens
- audit important account changes

## 11. MULTILINGUAL / RTL
Customer account UI must support:
- German
- Turkish
- English
- Arabic

Architecture must support additional languages later.
Arabic RTL must work for forms, dashboard, order tables and navigation.

## 12. RESPONSIVE
Optimize for:
- desktop
- laptop
- tablet
- smartphone

Mobile dashboard should use cards/stacked sections rather than forcing wide tables.

## 13. CUSTOMER COMMUNICATION
Prepare backend events for:
- account created
- email verification
- password reset
- order confirmation
- payment confirmation
- order shipped
- order delivered
- refund

Email templates must be localization-ready.

## 14. GDPR / DATA CONTROL
Prepare customer controls for:
- privacy information
- account data review
- account deletion request
- marketing preferences
- transactional vs marketing communication separation

Do not promise legal compliance automatically; provide the technical controls required for the implementation.

## 15. ACCEPTANCE TEST
Before completion:
1. Register test account.
2. Verify validation.
3. Login/logout.
4. Test password reset flow.
5. Open dashboard.
6. Create/edit/delete address.
7. Add product to wishlist.
8. Remove product from wishlist.
9. Open order list.
10. Open order detail.
11. Verify only the logged-in customer's data is visible.
12. Test mobile account area.
13. Test Arabic/RTL.
14. Test account deletion/data request architecture.
15. Confirm passwords are never stored in plain text.
16. Confirm payment card data is never stored.
17. Confirm no console errors.

## 16. CRITICAL
Customer data and order data must be protected server-side.
Never trust customer IDs, order IDs or authorization state supplied only by the browser.
