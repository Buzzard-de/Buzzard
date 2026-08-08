# BUZZARD — CURSOR PACKAGE 09
# SHIPPING + LOGISTICS + DROPSHIPPING + TRACKING

## 1. PURPOSE
Build the logistics layer connecting Buzzard orders to warehouses, dropshipping suppliers, carriers and customers.

Dependencies:
- Packages 01–08

## 2. SHIPPING MODEL
Create a flexible shipping architecture supporting:
- Buzzard stock/warehouse fulfillment
- supplier dropshipping
- multiple suppliers in one catalog
- future multi-warehouse fulfillment
- different shipping classes
- country-specific shipping rules

Do not hard-code one carrier or one supplier.

## 3. SHIPPING METHODS
Support configurable methods such as:
- standard shipping
- express shipping
- pickup where enabled
- free shipping where rules allow

Shipping prices and rules must be calculated server-side.

## 4. SHIPPING RULES
Prepare rules based on:
- destination country
- postal region
- order value
- order weight
- product shipping class
- supplier
- warehouse
- free-shipping threshold

Architecture must allow future EU expansion.

## 5. DROPSHIPPING FLOW
Implement the architecture:

Customer order
→ payment verification
→ stock verification
→ fulfillment decision
→ supplier order request
→ supplier confirmation
→ supplier fulfillment
→ tracking number
→ customer notification

Never send an order to a supplier before the order/payment rules permit it.

## 6. MULTI-SUPPLIER ORDERS
A single customer order may contain products from different suppliers.

The system must be able to split fulfillment into separate shipments while keeping:
- one customer order
- multiple fulfillment records
- multiple tracking numbers

Customer should see one order with clear shipment sections.

## 7. SUPPLIER ORDER
Create a private supplier-order model containing:
- supplier order ID
- Buzzard order ID
- supplier ID
- supplier SKU/items
- quantities
- shipping address
- order status
- supplier response
- tracking number
- timestamps
- errors/retry status

Supplier information must not be unnecessarily exposed to customers.

## 8. WHITE-LABEL / BLIND SHIPPING
Prepare supplier integrations for:
- blind shipping
- white-label shipping
- Buzzard branded packing slips where supported
- Buzzard thank-you inserts where supported

Never assume a supplier supports these features; store capability flags.

## 9. CARRIER ABSTRACTION
Create a carrier abstraction so future carriers can be connected without changing checkout/order components.

Examples that may be supported through adapters:
- DHL
- DPD
- GLS
- Hermes
- UPS
- other European carriers

Do not hard-code carrier-specific logic into the order UI.

## 10. TRACKING
Store:
- carrier
- tracking number
- tracking URL where available
- shipment status
- last tracking update
- shipment events

Customer order page should show tracking when available.

## 11. SHIPPING STATUS
Support:
- pending
- preparing
- handed_to_carrier
- in_transit
- out_for_delivery
- delivered
- exception
- returned

Customer-facing labels must be localized.

## 12. RETURNS
Prepare a return workflow architecture:
- return request
- order/item reference
- reason
- status
- return shipping information
- refund connection

Do not automatically approve every return; use configurable admin workflow.

## 13. FAILED FULFILLMENT
If supplier order fails:
- record error
- retry where appropriate
- prevent duplicate supplier orders
- alert authorized staff
- preserve the customer order
- provide manual intervention path

Use idempotency keys for supplier order submission where possible.

## 14. INVENTORY
Before fulfillment:
- verify stock
- reserve stock where appropriate
- prevent overselling
- update stock after successful fulfillment rules

Supplier stock synchronization remains connected to Package 05.

## 15. CUSTOMER NOTIFICATIONS
Prepare events for:
- order confirmed
- fulfillment started
- shipped
- tracking available
- delivery update
- delivered
- shipment exception
- return/refund

Use the customer's selected language from Package 08.

## 16. ADMIN LOGISTICS
Admin users should be able to view:
- orders
- fulfillment records
- supplier orders
- shipment status
- tracking numbers
- exceptions
- returns
- retry actions

Respect Package 07 role permissions.

## 17. RESPONSIVE
Customer tracking and order shipment information must work on:
- desktop
- laptop
- tablet
- smartphone
- Arabic RTL

## 18. SECURITY
- shipping addresses are private customer data
- supplier credentials remain server-side
- supplier APIs are called from the backend
- never trust client-submitted fulfillment status
- validate order ownership before displaying tracking
- log critical fulfillment actions

## 19. ACCEPTANCE TEST
Before completion:
1. Create a test order.
2. Verify shipping calculation.
3. Verify fulfillment decision.
4. Create a supplier fulfillment.
5. Test a multi-supplier order.
6. Verify shipment splitting.
7. Add tracking number.
8. Display tracking to customer.
9. Test a failed supplier request.
10. Test retry without duplicate supplier order.
11. Test shipment exception.
12. Test return request architecture.
13. Verify customer cannot see another customer's shipment.
14. Verify supplier credentials stay private.
15. Verify localized notifications.
16. Test Arabic RTL tracking view.
17. Confirm no console errors.

## 20. CRITICAL
Do not build a fake tracking page.
The architecture must be ready for real carrier APIs and real supplier fulfillment.
Never hard-code one logistics provider as the permanent solution.
