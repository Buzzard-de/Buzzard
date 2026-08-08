# BUZZARD — CURSOR PACKAGE 04
# PRODUCT DETAIL + CART + CHECKOUT + ORDER FLOW

## 1. PURPOSE
Build the complete customer purchase journey after the product catalog and navigation are in place.

Flow:
Product → Product Detail → Add to Cart → Cart → Checkout → Order Confirmation

Use Package 02 product data as the source of truth.

## 2. PRODUCT DETAIL PAGE
Create a premium, responsive product detail page with:
- image gallery
- zoom
- product title
- brand
- SKU/EAN where appropriate
- price
- VAT information
- stock status
- quantity selector
- variants
- Add to Cart
- Buy Now
- shipping information
- delivery estimate area
- product description
- technical specifications
- documents
- reviews
- related products
- frequently bought together
- trust/returns/payment information

Do not hard-code product content into the component.

## 3. ADD TO CART
When the customer clicks Add to Cart:
- validate product availability
- validate selected variant
- add correct product/variant/quantity
- update cart count immediately
- preserve cart across page navigation
- prevent accidental duplicate submissions
- show clear success feedback

## 4. CART
Cart must show:
- product image
- product name
- variant
- SKU where useful
- quantity controls
- unit price
- line total
- remove item
- subtotal
- shipping estimate
- VAT information
- total
- discount/coupon area
- checkout button

Support quantity changes without losing the cart.

## 5. CART RULES
The cart architecture must support:
- multiple products
- multiple quantities
- variants
- future promotions
- coupons
- free-shipping thresholds
- different shipping classes
- future B2B pricing

Do not calculate important prices only visually in the frontend.

## 6. CHECKOUT
Create a clean multi-step or single-page checkout with:
1. Customer information
2. Shipping address
3. Billing address
4. Shipping method
5. Payment method
6. Order review
7. Order placement

Allow billing address to differ from shipping address.

## 7. GERMANY / EUROPE READY
Prepare checkout for German/European e-commerce requirements:
- country selection
- German address structure
- VAT/tax calculation layer
- invoice information
- legal confirmation areas
- privacy/terms links
- guest checkout
- customer account checkout

Do not hard-code Germany into the data model; support future EU expansion.

## 8. PAYMENT
Payment must be implemented through a secure payment-provider abstraction.
Do not store raw card details.

Prepare the architecture for common payment providers such as:
- PayPal
- Stripe
- Klarna
- SEPA where applicable
- other future providers

The payment provider layer must be replaceable.

## 9. ORDER
Every successful order receives:
- unique order ID
- order number
- customer reference
- order items
- prices
- VAT
- shipping cost
- discount
- final total
- payment status
- fulfillment status
- timestamps

Order data must be stored server-side.

## 10. ORDER STATUS
Support at least:
- pending
- payment_pending
- paid
- processing
- shipped
- delivered
- cancelled
- refunded

Architecture must allow future return/refund workflows.

## 11. ORDER CONFIRMATION
After successful order:
- show confirmation page
- display order number
- show summary
- show delivery information
- show customer support information
- send confirmation through backend/email service where configured

Never rely only on frontend state for order confirmation.

## 12. SECURITY
Important:
- validate prices server-side
- validate stock server-side
- validate discounts server-side
- validate payment status server-side
- never trust client-submitted totals
- never expose supplier purchase price
- never store raw payment card data
- protect authenticated customer data
- use secure server/API boundaries

## 13. RESPONSIVE
Checkout must work especially well on smartphone.
Controls must be touch-friendly.
Do not create a separate unrelated mobile checkout.

## 14. MULTILINGUAL
Prepare all checkout UI for multilingual operation.
Support Arabic and RTL without breaking forms, totals or navigation.

## 15. UX
Keep checkout simple:
- minimal distractions
- clear totals
- clear errors
- clear required fields
- progress indication where multi-step
- easy return to cart
- trust messaging without clutter

## 16. ACCEPTANCE TEST
Before completion:
1. Open a product.
2. Add it to cart.
3. Change quantity.
4. Remove it.
5. Add multiple products.
6. Test variants.
7. Open checkout.
8. Test shipping and billing addresses.
9. Test guest checkout.
10. Verify server-side total calculation.
11. Verify payment-provider abstraction.
12. Create test order.
13. Verify unique order number.
14. Verify confirmation page.
15. Verify order status.
16. Verify mobile checkout.
17. Verify Arabic/RTL forms.
18. Confirm no supplier purchase price is exposed.
19. Confirm no raw payment data is stored.
20. Confirm no console errors.

## 17. CRITICAL
Do not build a fake checkout that only changes frontend screens.
The final architecture must be ready for real orders, real inventory, real payment integration and real fulfillment.
