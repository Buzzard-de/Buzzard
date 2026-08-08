# BUZZARD — CURSOR PACKAGE 07
# SECURITY + AUTHORIZATION + ADMIN ROLES + PLATFORM PROTECTION

## 1. PURPOSE
Build the security foundation for the Buzzard platform.

Dependencies:
- Packages 01–06

This package must protect customer accounts, orders, products, supplier data, admin functions and APIs.

## 2. AUTHENTICATION
Implement secure authentication architecture for:
- customer login
- customer registration
- admin login
- logout
- password reset
- email verification
- session/token lifecycle

Never store plain-text passwords.

Use secure password hashing and secure session/token handling.

## 3. AUTHORIZATION
Implement server-side authorization.

At minimum support:
- customer
- administrator
- catalog_manager
- order_manager
- read_only

Users must only access resources permitted by their role.

Never rely only on frontend route protection.

## 4. CUSTOMER DATA ISOLATION
A customer must only be able to access:
- their own profile
- their own addresses
- their own wishlist
- their own orders

Never trust a customer ID supplied by the browser.

Always derive identity from the authenticated server-side session/token.

## 5. ADMIN PROTECTION
Protect:
- supplier credentials
- purchase prices
- supplier mappings
- inventory controls
- product management
- customer data
- order management
- system configuration
- API keys

Admin endpoints must require appropriate roles.

## 6. API SECURITY
Prepare a secure API architecture with:
- authentication
- authorization
- request validation
- rate limiting
- input sanitization
- consistent error responses
- logging
- CORS configuration
- CSRF protection where applicable

Never expose secrets in frontend bundles.

## 7. INPUT VALIDATION
Validate all external input:
- registration
- login
- checkout
- addresses
- product forms
- supplier imports
- search/filter parameters
- coupon codes
- admin forms
- API requests

Do not trust client-side validation alone.

## 8. PAYMENT SECURITY
The application must:
- never store raw card details
- never trust client-submitted payment status
- verify payment server-side through the payment provider
- verify order totals server-side
- prevent duplicate payment/order submission

## 9. WEB SECURITY
Protect against common web vulnerabilities:
- XSS
- SQL injection
- CSRF where applicable
- SSRF where applicable
- broken access control
- insecure direct object references
- malicious file uploads
- credential stuffing
- brute-force attacks

Use framework/database security mechanisms rather than custom unsafe implementations.

## 10. FILE UPLOADS
For product/customer/admin uploads:
- validate file type
- validate file size
- sanitize file names
- prevent executable uploads
- store outside executable web paths where appropriate
- use controlled media URLs

## 11. SECRETS
API keys, database credentials, supplier credentials and payment secrets must:
- remain server-side
- be stored through environment/secret management
- never be committed to Git
- never appear in logs
- never appear in public API responses

Create a safe `.env.example` containing variable names only.

## 12. LOGGING & MONITORING
Create structured logs for:
- authentication events
- authorization failures
- admin actions
- import failures
- payment events
- critical system errors

Never log passwords, payment card details or secret API credentials.

## 13. AUDIT LOG
Important admin changes must record:
- user
- action
- resource
- old value where appropriate
- new value where appropriate
- timestamp
- request/context reference

## 14. RATE LIMITING
Apply sensible rate limits to:
- login
- registration
- password reset
- sensitive account actions
- public APIs
- supplier endpoints
- search where abuse is possible

Do not make the entire site unusable through excessive limits.

## 15. DATABASE
Use:
- parameterized queries/ORM
- foreign keys
- appropriate indexes
- unique constraints
- transaction boundaries for critical operations

Critical operations such as order creation and payment confirmation must be atomic where possible.

## 16. ERROR HANDLING
Public errors must not reveal:
- database internals
- stack traces
- secret values
- supplier credentials
- internal paths

Provide useful user-facing messages and detailed private logs.

## 17. SECURITY HEADERS
Configure appropriate production security headers such as:
- Content-Security-Policy where compatible
- HSTS in HTTPS production
- X-Content-Type-Options
- Referrer-Policy
- frame protection
- secure cookie settings

Do not blindly apply a header configuration that breaks required integrations; test each policy.

## 18. BACKUP / RECOVERY READINESS
Prepare architecture for:
- database backups
- restore testing
- media backup
- configuration recovery

Do not claim backups exist unless actually configured.

## 19. GDPR / PRIVACY TECHNICAL CONTROLS
Provide technical mechanisms for:
- account data export
- account deletion request
- marketing consent management
- transactional vs marketing communication separation
- access control to personal data

Do not hard-code legal claims into the system.

## 20. SECURITY ACCEPTANCE TEST
Before completion:
1. Test customer authorization.
2. Verify customer A cannot access customer B data.
3. Test admin roles.
4. Verify read_only cannot modify data.
5. Verify catalog_manager cannot access unrelated sensitive settings unless permitted.
6. Verify order_manager permissions.
7. Test rate limiting.
8. Test password reset security.
9. Test input validation.
10. Test malicious file upload rejection.
11. Verify secrets are absent from frontend bundles.
12. Verify secrets are absent from Git-tracked files.
13. Verify payment status is server-verified.
14. Verify audit logs.
15. Verify public errors do not expose internals.
16. Verify security headers in production configuration.
17. Run dependency/security checks available in the project.
18. Confirm no console errors.

## 21. CRITICAL
Security must be implemented in the backend/server layer, not simulated with frontend checks.
Do not weaken security just to make the demo work.
Any temporary test bypass must be clearly isolated and disabled before production.
