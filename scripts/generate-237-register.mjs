/**
 * Generates the 237-item execution register from directive category bands.
 * Does NOT invent a canonical original checklist. Original titles remain UNKNOWN
 * because no numbered 1–237 source file exists in this repository.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(ROOT, "docs/software-completion");
const DATE = "2026-10-14";
const HEAD = "5ba16b2d5549e8b759d023a13d6555291971fb63+working-tree";

const BANDS = [
  [1, 19, "Baseline, architecture, access control, security foundations, configuration, feature flags, data protection, project integrity"],
  [20, 34, "Buzzard Core, shared business services, common interfaces, data contracts, core infrastructure"],
  [35, 55, "Pusat Orchestrator, agent coordination, central AI memory, specialist agents, task orchestration, error handling, AI governance"],
  [56, 74, "Product catalog, canonical product model, PIM, taxonomy, category localization, product validation, Product SoT readiness (inactive)"],
  [75, 94, "Pricing, profit, supplier integrations, normalization, inventory sync, availability, shipping costs, pricing safeguards"],
  [95, 113, "Orders, checkout, payment adapters, finance, refunds, returns, reconciliation, idempotency, fraud, financial authorization"],
  [114, 136, "Marketplace connectors, listings, market configuration, VAT, localization, multilingual, international expansion"],
  [137, 151, "Homepage, navigation, product pages, search, responsive layouts, CX, accessibility, language/country, RTL, UI regression"],
  [152, 167, "Shipping, customer operations, tracking, notifications, accounts, returns, carriers, operational visibility"],
  [168, 182, "Human Approval Center, exception handling, approval policies, identity, financial limits, hashes, expiry, replay, audit"],
  [183, 195, "Observability, structured logs, metrics, alerting, backup, restore, persistence, recovery, incident evidence"],
  [196, 212, "Unit, integration, API security, E2E, regression, load-safe checks, build, lint, typecheck, release quality"],
  [213, 226, "Production readiness, env config, deployment preparation, integrations, secrets, monitoring, launch controls"],
  [227, 237, "Esat Bey / Guardian maximum-security: threat detection, authz, anomaly, telemetry, containment (no autonomous destructive), audit, isolation, IR"],
];

const SCOPES = {
  1: ["Repository baseline and working-tree integrity", "Inspect branch, HEAD, dirty files, ancestry; do not destroy work", "git status / git log", "PARTIAL", 70, "HEAD inspectable; remote CI UNKNOWN"],
  2: ["Architecture inventory without duplicate systems", "Single Pusat, single approval center, single product write boundary", "server/lib/pusat, productWriteBoundary, controlCenter", "PARTIAL", 75, "Facades exist; SoT inactive by design"],
  3: ["Authentication on protected endpoints", "Unauthenticated callers cannot use protected routes", "globalAuthMiddleware, wrapRouteHandler", "PARTIAL", 80, "Unit fortressAuthz; production UNKNOWN"],
  4: ["Authorization / RBAC on protected operations", "Permission checks on admin and AI tool paths", "rbac.js, routePermissions.js", "PARTIAL", 80, "Plugin audit exists; not every alternate path production-probed"],
  5: ["Object-level access and IDOR protection", "Cross-customer cart/order/checkout denied", "commerceGuards.js", "PARTIAL", 85, "guestCommerceAccess + E2E IDOR passed locally"],
  6: ["Admin and customer session separation", "Distinct HttpOnly cookies; no session mix-up", "auth.js, customerAuth.js", "PARTIAL", 80, "Cookie closeout present; Secure flag needs HTTPS"],
  7: ["Cookie flags HttpOnly, Secure, SameSite", "Session cookies not readable by JS; CSRF companion token", "admin/customer cookie helpers", "PARTIAL", 75, "HttpOnly set; Secure on HTTPS only; Playwright cookie gap on HTTP static"],
  8: ["CSRF protection for cookie-authenticated mutations", "Mutating cookie session requires X-Buzzard-CSRF-Token", "csrf tests", "PARTIAL", 85, "csrf.test.mjs passed locally"],
  9: ["CORS origin and header policy", "Unlisted Origin rejected; null Origin not trusted unless listed", "corsOrigins.js", "PARTIAL", 85, "corsOrigins tests; guest headers allowed"],
  10: ["Production JWT secret fail-closed", "Empty/default JWT_SECRET throws in production", "jwtSecret.js, environmentValidation.js", "PARTIAL", 90, "jwtSecret.test.mjs; production secret value UNKNOWN"],
  11: ["Rate limiting remains enabled", "Production cannot set RATE_LIMIT_DISABLED; health has own bucket", "rateLimitStore.js, server.js", "PARTIAL", 80, "TEST_MODE still disables limiter for CI E2E isolation only; production forbids TEST_MODE"],
  12: ["Feature flags sales / SoT / live payments parent-child", "Child commercial flags ineffective while sales off; SoT never auto-active", "commerceFeatureFlags.js", "PARTIAL", 90, "Unit tests this pass; flags remain OFF in workspace"],
  13: ["Environment validation at startup", "Production rejects test mode, disabled rate limit, default JWT, live payments without sales", "environmentValidation.js", "PARTIAL", 85, "Unit tested; production startup not observed"],
  14: ["Secrets redaction and secure configuration", "No secrets in logs/reports/commits", "securityLog, guardian.scanSecrets", "PARTIAL", 70, "Guardian rejects secret-bearing payloads; no production secret audit this session"],
  15: ["Request validation and safe error messages", "Client totals rejected; public errors do not leak internals", "commerceValidation.js, publicErrorBody", "PARTIAL", 80, "part8 validation tests"],
  16: ["Guest commerce proof for cart/checkout/order", "Guest without session/token fail-closed", "commerceGuards, checkoutService, orderService", "PARTIAL", 90, "guestCommerceAccess unit passed"],
  17: ["Diagnostic / Guardian / Orchestrator / DB GET protection", "Unauthenticated diagnostic prefixes 401", "routePermissions, globalAuthMiddleware", "PARTIAL", 85, "fortressAuthz / routePermissions tests"],
  18: ["Data protection and durable storage design", "App data not persisted in /tmp; intended DB path used", "dbPaths.js", "PARTIAL", 60, "Local SQLite path known; production persistence UNKNOWN"],
  19: ["Project integrity: commercial locks stay off", "SALES, SoT, LIVE_PAYMENTS remain off; no fail-open auth wrappers", "salesMode.js, process env", "PARTIAL", 90, "Workspace env verified; production env not probed"],
  20: ["Shared commerce constants and state machines", "Checkout and order transitions enforced", "commerceConstants.js", "PARTIAL", 85, "part8Foundation"],
  21: ["Common error contracts", "Public error keys without stack traces", "publicErrorBody", "PARTIAL", 70, "Used on API; not every plugin audited this pass"],
  22: ["Cart data contract", "Server-owned totals; session binding", "cartService.js", "PARTIAL", 85, "Writes require bound session"],
  23: ["Checkout data contract", "Sales lock; guest proof", "checkoutService.js", "PARTIAL", 80, "Commercial checkout blocked while sales off"],
  24: ["Order data contract", "Guest token stripped from public map", "orderService.js", "PARTIAL", 80, "Unit + E2E blocked commercial path"],
  25: ["Product data contract", "Canonical product fields via PIM core", "productCore.js", "PARTIAL", 75, "Multiple stores still classified; SoT off"],
  26: ["Core DB schema and migrations", "Additive software/pusat tables", "db.js migrateSoftwareCompletion", "PARTIAL", 70, "Local migrate; production migrate HUMAN"],
  27: ["Shared quantity and total validation", "Negative qty and client totals rejected", "commerceValidation.js", "PARTIAL", 90, "part8Foundation"],
  28: ["Idempotency-key plumbing", "Sensitive commerce operations accept Idempotency-Key", "server.js CORS allow-headers, payment paths", "PARTIAL", 65, "Header allowed; not every mutation proven idempotent"],
  29: ["Request correlation IDs", "X-Request-Id / X-Correlation-Id on API", "correlationContext", "PARTIAL", 75, "Set on API responses"],
  30: ["Software facade is not a second orchestrator", "server/lib/software wraps existing engines", "server/lib/software", "PARTIAL", 80, "CODE_IMPLEMENTATION_STATUS"],
  31: ["API health endpoints", "Health remains rate-limited on its own bucket", "server.js, health plugins", "PARTIAL", 75, "Separated from global 180/min API bucket; still limited"],
  32: ["Plugin / route registry", "wrapRouteHandler on registered routes", "server.js plugin load", "PARTIAL", 70, "Registered plugins wrapped; unregistered paths 404"],
  33: ["Catalog vs commerce mode split", "Sales off => catalog mode", "salesMode.js", "PARTIAL", 90, "isSalesEnabled === false in workspace"],
  34: ["Core shared-service test harness", "Vitest unit suite for commerce core", "server/__tests__", "PARTIAL", 80, "927 passed historically; re-run this session focused"],
  35: ["Pusat orchestrator core", "Initialize, dispatch, health", "server/lib/pusat", "PARTIAL", 80, "test:ai historically green"],
  36: ["Agent registry and coordination", "Employee/agent registry", "pusat/agents.js", "PARTIAL", 70, "Recommendation-only extras exist"],
  37: ["Central AI memory", "Host/kv style memory in Pusat", "pusat memory modules", "PARTIAL", 70, "pusatMemoryGuardian tests"],
  38: ["Specialist agents", "Named agents with tools", "pusat/agents.js", "PARTIAL", 65, "Some agents NOT_IMPLEMENTED"],
  39: ["Task orchestration", "Tasks wait on approval", "pusat/lifecycle.js", "PARTIAL", 75, "WAITING_APPROVAL path"],
  40: ["Pusat error handling fail-closed", "Exceptions classified; payments not retried", "pusat/exceptions", "PARTIAL", 85, "pusatApprovalExceptions"],
  41: ["AI governance: cannot self-approve", "decide() rejects requesting agent / AI identity", "pusat/approval.js", "PARTIAL", 90, "New unit test this session"],
  42: ["Dispatch idempotency", "Durable read-only dispatch keys", "pusat idempotency", "PARTIAL", 70, "Branch ancestry includes pusat-idempotency"],
  43: ["Worker integration", "Pusat worker hooks", "pusatWorkerIntegration tests", "PARTIAL", 65, "Local unit; no live workers claimed"],
  44: ["Agent approval requests", "requestApproval bound to input hash", "pusat/approval.js", "PARTIAL", 85, "Hash + TTL"],
  45: ["Pusat exception dead-letter", "Retry then DEAD_LETTER", "exceptions.shouldRetry", "PARTIAL", 80, "Unit tested"],
  46: ["Memory and Guardian tests", "Guardian deny + memory tests", "pusatMemoryGuardian.test.mjs", "PARTIAL", 75, "Existing suite"],
  47: ["Stub vs live LLM providers", "Stub default; live not claimed", "aiProviders.js", "PARTIAL", 70, "STUB default"],
  48: ["AI tool rate limit", "Guardian per-agent rate window", "pusat/guardian.js", "PARTIAL", 75, "RATE_LIMIT 60/min"],
  49: ["Agent isolation via permissions", "aiCanExecute + tool allow-list", "rbac + guardian", "PARTIAL", 75, "Missing identity fail-closed"],
  50: ["Sensitive action classification", "SENSITIVE_ACTIONS require approval", "pusat/constants", "PARTIAL", 80, "CRITICAL always approval"],
  51: ["Orchestrator HTTP protection", "GET /api/orchestrator prefix authenticated", "routePermissions", "PARTIAL", 80, "Diagnostic prefix 401"],
  52: ["Automations non-destructive", "No autonomous money movement", "pusat automations", "PARTIAL", 70, "Sensitive actions gated"],
  53: ["Cross-process memory proof", "Documented in AI completion", "docs/ai-automation-completion", "PARTIAL", 60, "Prior reports; not re-proven this session"],
  54: ["Recommendation-only assistants", "Cannot execute commercial side effects", "pusat/agents.js", "PARTIAL", 70, "status NOT_IMPLEMENTED on some"],
  55: ["Pusat health/status", "Health reports stub/live honestly", "pusat/health.js", "PARTIAL", 75, "stub:true when STUB"],
  56: ["Canonical product model", "productCore create/read", "productCore.js", "PARTIAL", 75, "SoT not cut over"],
  57: ["PIM write boundary", "authorizeCreate/Update/Delete; actor from session", "productWriteBoundary.js", "PARTIAL", 85, "Dual-write forbidden"],
  58: ["Customer-facing taxonomy L1", "50 customer L1 categories", "i18n / taxonomy artifacts", "PARTIAL", 80, "Prior localization work"],
  59: ["Category localization", "DE/EN/TR/AR labels", "lib/i18n", "PARTIAL", 75, "Fill scripts exist"],
  60: ["Product validation", "PIM validation / customs decision", "productValidator", "PARTIAL", 70, "Playwright PIM dry-run copy failed on static export"],
  61: ["Product SoT readiness while inactive", "activationStatus.activated false even if env flag", "productArchitecture.js", "PARTIAL", 90, "productSourceOfTruthActive hardcoded false"],
  62: ["Dual-write forbidden", "assertNoDualWrite throws", "productArchitecture.js", "PARTIAL", 90, "Unit productArchitecture"],
  63: ["SKU uniqueness", "productStore uniqueness", "productStore.js", "PARTIAL", 75, "Per-store uniqueness; not global SoT"],
  64: ["Catalog SEO", "createProduct active=0", "catalogSeo.js", "PARTIAL", 70, "Admin session actor"],
  65: ["JSON product store", "Optional BUZZARD_PRODUCT_STORE_PATH", "productStore.js", "PARTIAL", 70, "Test path supported"],
  66: ["PIM import dry-run", "No live import without flag", "pim-import.mjs", "PARTIAL", 60, "E2E dry-run UI mismatch (copy)"],
  67: ["PIM publish gated", "Publish not SoT activation", "pim-publish.mjs", "HUMAN_APPROVAL_REQUIRED", 40, "Live publish HUMAN"],
  68: ["Storefront catalog read", "catalogCache / catalogReadService", "catalogReadService", "PARTIAL", 75, "Search uses canonical read"],
  69: ["Search index local", "sync-search-index; not live OpenSearch", "search.js, productSearchAbstraction", "PARTIAL", 50, "opensearch_stub"],
  70: ["Product i18n", "fill-product-i18n-gaps", "scripts/fill-product-i18n-gaps.mjs", "PARTIAL", 65, "Gaps fillable; not all locales proven"],
  71: ["Customs validation on products", "validateCustomsDecision", "productValidator", "PARTIAL", 70, "Engine present"],
  72: ["Catalog / PIM health", "pimCatalog plugin health", "pimCatalogPlugin", "PARTIAL", 70, "Admin workflow"],
  73: ["SoT activation remains human-gated", "humanApprovalRequired true", "activationStatus()", "HUMAN_APPROVAL_REQUIRED", 50, "Safe software keeps SoT off"],
  74: ["No invented live prices or images", "Catalog mode; no fake LIVE_VERIFIED prices", "policy", "PARTIAL", 80, "Honored this session"],
  75: ["Pricing engine", "server/lib/pricing.js", "pricing.js", "PARTIAL", 75, "Unit historically"],
  76: ["Profit calculation / MIN_NET_PROFIT", "MIN_NET_PROFIT_EUR 0.50", "pricing safeguards", "PARTIAL", 70, "Constant documented"],
  77: ["Supplier integration framework", "Connector inventory; no real PO", "software/connectorInventory.js", "PARTIAL", 55, "Many NOT_IMPLEMENTED live"],
  78: ["Supplier normalization", "Feed dry-run CSV/XML/JSON", "supplierFeeds.js", "PARTIAL", 60, "No live fetch"],
  79: ["Inventory synchronization (local)", "stockEngine", "stockEngine.js", "PARTIAL", 65, "Local tables; live supplier sync BLOCKED"],
  80: ["Supplier availability", "Adapter class / mock", "software inventory", "PARTIAL", 50, "MOCK_OR_SIMULATED"],
  81: ["Shipping cost calculation local", "shippingProvider stubs", "shippingProvider.js", "PARTIAL", 50, "No live rates"],
  82: ["Pricing safeguards / no undercut", "MARKET_UNDERCUT_IMPLEMENTED false", "pricing policy", "NOT_APPLICABLE_WITH_EVIDENCE", 100, "Explicitly out of scope; not implemented by policy"],
  83: ["Supplier feeds dry-run only", "No live fetch", "supplierFeeds.js", "PARTIAL", 70, "Fixture only"],
  84: ["No real purchase orders", "supplierOrdersEnabled false", "commerceFeatureFlags", "PARTIAL", 90, "Child flag gated"],
  85: ["Stock engine", "operations/stockEngine.js", "stockEngine.js", "PARTIAL", 70, "Implemented/tested historically"],
  86: ["WMS reserve vs software reserve", "Two tables; shared audit only", "REMAINING_SOFTWARE_WORK", "PARTIAL", 40, "Do not share reservation authority"],
  87: ["Inter-Cars adapter class", "Sandbox/mock; no live order", "adapters/interCarsAdapter.js", "BLOCKED_EXTERNAL_DEPENDENCY", 58, "2026-10-17: mock + LIVE_PO_BLOCKED; live credentials remaining"],
  88: ["TecDoc adapter class", "Classification / adapter", "adapters/tecdocAdapter.js", "BLOCKED_EXTERNAL_DEPENDENCY", 58, "2026-10-17: mock catalog; key ≠ HTTP; live TecDoc remaining"],
  89: ["Price snapshot on cart", "priceSnapshot field", "commerceValidation computeOrderTotals", "PARTIAL", 80, "Server totals"],
  90: ["Currency handling", "Market currency", "market-engine", "PARTIAL", 70, "Registry present"],
  91: ["Market price rules", "Per-market config", "lib/market-engine", "PARTIAL", 65, "35 markets classified"],
  92: ["Supplier connector inventory honesty", "class NOT_IMPLEMENTED where true", "connectorInventory.js", "PARTIAL", 80, "Honest classification"],
  93: ["Supplier retry/idempotency", "Fail-closed outage", "software/carriers and feeds", "PARTIAL", 50, "Feeds not live"],
  94: ["Fail-closed supplier outage", "Malformed/outage not treated as stock", "carriers.js", "PARTIAL", 60, "Stubs fail-closed"],
  95: ["Cart service", "Session-bound writes", "cartService.js", "PARTIAL", 85, "assertCartAccess"],
  96: ["Checkout service", "Sales lock + guest proof", "checkoutService.js", "PARTIAL", 80, "Commercial blocked"],
  97: ["Order service", "skipAccessCheck only internal", "orderService.js", "PARTIAL", 80, "Guest token stripped"],
  98: ["Stripe payment adapter", "Live HTTP requires sales AND LIVE_PAYMENTS", "stripeAdapter.js", "PARTIAL", 55, "ADAPTER_IMPLEMENTED; LIVE_VERIFIED false; MOCK/sandbox UNKNOWN"],
  99: ["PayPal payment adapter", "Same live gate", "paypalAdapter.js", "PARTIAL", 55, "ADAPTER_IMPLEMENTED; not live"],
  100: ["Dual payment engine", "Diagnostics use effective flags not raw env", "dualPaymentEngine.js", "PARTIAL", 70, "providerDiagnostics now effective flags"],
  101: ["Finance confirm fail-closed", "PROVIDER_CONFIRMATION_REQUIRED 409", "finance paths", "PARTIAL", 85, "fortressAuthz"],
  102: ["Refund fail-closed", "PROVIDER_REFUND_REQUIRED 409", "finance paths", "PARTIAL", 85, "fortressAuthz"],
  103: ["Returns RMA", "Customer refund ≠ supplier credit", "returnsRma + software/returns", "PARTIAL", 70, "Ledger wrap"],
  104: ["Financial reconciliation local", "No invented revenue", "software/reporting.js", "PARTIAL", 60, "inventedRevenue:false"],
  105: ["Payment idempotency", "Timeout UNCERTAIN never retried as success", "software/payments.js", "PARTIAL", 75, "Timeout policy"],
  106: ["Fraud safeguards", "Client cannot mark paid", "dualPaymentEngine.clientCannotMarkPaid", "PARTIAL", 80, "Unit secureCommerce"],
  107: ["Financial authorization", "Finance endpoints not public", "routePermissions / fortress", "PARTIAL", 80, "Authz tests"],
  108: ["Live payments gated", "livePaymentsEnabled false in this workspace", "commerceFeatureFlags", "PARTIAL", 90, "Flag off; adapters gated"],
  109: ["Webhook signature verification", "Unsigned cannot mark paid", "officialPaymentIngress", "PARTIAL", 75, "Legacy paths audit-only"],
  110: ["Guest checkout proof", "401 without proof", "commerceGuards", "PARTIAL", 90, "guestCommerceAccess"],
  111: ["Order identity / QR", "Phase 3 identity", "orderIdentityLoyalty tests", "PARTIAL", 70, "Historical unit"],
  112: ["Loyalty non-abuse", "Cannot mint value via guest IDOR", "loyalty + guards", "PARTIAL", 60, "Not fully re-audited this pass"],
  113: ["Official payment ingress", "Single official webhook path", "officialPaymentIngress.js", "PARTIAL", 75, "describeIngress uses effective flags"],
  114: ["Marketplace hub classification", "Classification only for missing channels", "marketplaceHub", "PARTIAL", 50, "Not live adapters"],
  115: ["Listing model without live publish", "Mutations gated", "marketplace software", "HUMAN_APPROVAL_REQUIRED", 40, "No live listing"],
  116: ["Market configuration 35 markets", "market-engine registry", "lib/market-engine", "PARTIAL", 80, "market tests historically"],
  117: ["VAT configuration", "Per-market VAT", "market engine / tax", "PARTIAL", 60, "Rules present; fiscal LIVE UNKNOWN"],
  118: ["Localization 30 locales", "lib/i18n", "lib/i18n", "PARTIAL", 75, "30 locales claimed in prior status"],
  119: ["Multilingual storefront", "Locale hydration must not rewrite wrongly", "homepage-multicategory ancestry", "PARTIAL", 70, "Prior fix; not re-run visual this pass"],
  120: ["International expansion registry", "Markets listed", "market-engine", "PARTIAL", 65, "Registry ≠ live operations"],
  121: ["Marketplace readiness flags", "Live publish off", "feature flags", "PARTIAL", 70, "Sales off implies no live listings"],
  122: ["Amazon/eBay class if present", "Inventory honesty", "connectorInventory", "PARTIAL", 40, "Check class fields; not LIVE_VERIFIED"],
  123: ["OTTO classification-only", "No live adapter claimed", "REMAINING_SOFTWARE_WORK", "NOT_IMPLEMENTED", 10, "Classification only"],
  124: ["eMAG classification-only", "No live adapter", "same", "NOT_IMPLEMENTED", 10, "Classification only"],
  125: ["Skroutz classification-only", "No live adapter", "same", "NOT_IMPLEMENTED", 10, "Classification only"],
  126: ["bol.com classification-only", "No live adapter", "same", "NOT_IMPLEMENTED", 10, "Classification only"],
  127: ["Cdiscount classification-only", "No live adapter", "same", "NOT_IMPLEMENTED", 10, "Classification only"],
  128: ["Channel mapping", "Hub vs software lists", "marketplaceHub", "PARTIAL", 40, "Duplicate sources noted"],
  129: ["Marketplace mutations gated", "No publish without approval", "approval + flags", "HUMAN_APPROVAL_REQUIRED", 40, "Workflow exists; action pending"],
  130: ["RTL markets", "RTL CSS", "storefront CSS", "PARTIAL", 70, "Prior RTL work"],
  131: ["Country and language independence", "Locale not rewritten on market hydrate", "i18n", "PARTIAL", 70, "Prior commit"],
  132: ["Market engine registry tests", "Vitest market checks", "market tests", "PARTIAL", 75, "Historical"],
  133: ["Currency per market", "Registry currency", "market-engine", "PARTIAL", 70, "Config present"],
  134: ["Legal pages per market", "Impressum redirects historically", "scripts/sync-redirects", "PARTIAL", 50, "Not re-crawled this session"],
  135: ["Feed export dry-run", "No live marketplace push", "software feeds", "PARTIAL", 40, "Dry-run only"],
  136: ["No live listing this session", "Policy", "safety rules", "PARTIAL", 100, "Honored: no marketplace mutation executed"],
  137: ["Homepage", "Storefront home", "app pages", "PARTIAL", 70, "Playwright 6 failures include mega menu timeout"],
  138: ["Navigation / mega menu", "Desktop mega menu", "nav components", "PARTIAL", 50, "E2E timeout 90s on static export"],
  139: ["Product pages", "PDP 200 / unknown 404", "prior phase 9", "PARTIAL", 70, "Historical; not re-run all PDPs"],
  140: ["Search UI", "Storefront search", "search components", "PARTIAL", 60, "Index stub"],
  141: ["Responsive layouts", "Mobile homepage work", "mobile CSS", "PARTIAL", 70, "Many prior mobile PRs"],
  142: ["Customer experience readiness", "customerExperienceReadiness", "customerExperienceReadiness.js", "PARTIAL", 65, "part19 tests historically"],
  143: ["Accessibility", "Not a full WCAG audit this session", "UI", "PARTIAL", 30, "No dedicated a11y run this session"],
  144: ["Language selection", "Locale switcher", "i18n UI", "PARTIAL", 70, "Prior"],
  145: ["Country selection", "Market switcher", "market UI", "PARTIAL", 70, "Prior"],
  146: ["RTL CSS", "Arabic/Hebrew direction", "storefront CSS", "PARTIAL", 70, "Prior RTL"],
  147: ["UI regression Playwright", "Isolated :3010 static + :3001 API", "e2e/", "PARTIAL", 70, "100 passed / 6 failed / 13 skipped last isolated run"],
  148: ["Mobile homepage", "Phone layouts", "mobile components", "PARTIAL", 70, "Prior visual PRs"],
  149: ["Category boxes and drawers", "Phone drawers", "mobile nav", "PARTIAL", 70, "Prior"],
  150: ["Admin UI pages", "Control Center / PIM / Sessions", "components/admin", "PARTIAL", 60, "Static export + API; session cookie gap HTTP"],
  151: ["Cart and account chrome", "Header cart", "storefront header", "PARTIAL", 65, "Guest session headers wired"],
  152: ["Shipping data models", "shipmentGate", "dualPaymentEngine.evaluateShipment", "PARTIAL", 60, "Gate exists"],
  153: ["Customer operations", "customerOrderBridge", "customerOrderBridge", "PARTIAL", 70, "Implemented/tested historically"],
  154: ["Tracking UI", "Scan-based stub; not GPS", "software/carriers.js", "PARTIAL", 40, "Explicitly not live GPS"],
  155: ["Notifications draft / send blocked", "communications.js send BLOCKED", "software/communications.js", "HUMAN_APPROVAL_REQUIRED", 50, "Drafts only"],
  156: ["Customer accounts", "customerAuth login rate limit", "customerAuth.js", "PARTIAL", 75, "Rate limit 8/15min"],
  157: ["Returns workflows", "RMA + ledger", "software/returns.js", "PARTIAL", 70, "Refund ≠ supplier credit"],
  158: ["Carrier adapter DHL", "Stub", "carriers.js", "PARTIAL", 30, "ADAPTER stub; no label purchase"],
  159: ["Carrier adapter DPD", "Stub", "carriers.js", "PARTIAL", 30, "Stub"],
  160: ["Carrier adapter GLS", "Stub", "carriers.js", "PARTIAL", 30, "Stub"],
  161: ["Carrier adapter Hermes", "Stub", "carriers.js", "PARTIAL", 30, "Stub"],
  162: ["Carrier adapter UPS", "Stub", "carriers.js", "PARTIAL", 30, "Stub"],
  163: ["No real label purchase", "Policy", "safety", "PARTIAL", 100, "Honored this session"],
  164: ["Operational visibility", "Control Center events", "controlCenter.js", "PARTIAL", 70, "System events recorded"],
  165: ["Communications module", "Send always BLOCKED", "communications.js", "HUMAN_APPROVAL_REQUIRED", 50, "External send pending"],
  166: ["Customer order bridge", "Existing engine", "customerOrderBridge", "PARTIAL", 70, "Reused"],
  167: ["Scan-based tracking honesty", "carriers note not live GPS", "carriers.js", "PARTIAL", 80, "Honest note in code"],
  168: ["Human Approval Center", "controlCenter delegates to pusat.approval", "controlCenter.js", "PARTIAL", 85, "Bridge tests"],
  169: ["Exception handling", "Pusat exceptions", "pusat/exceptions", "PARTIAL", 80, "Unit"],
  170: ["Approval policies", "TTL, risk, requiredApprover", "approval.js", "PARTIAL", 80, "Defaults HIGH"],
  171: ["Approver identity required", "Empty decidedBy rejected on approve", "isForbiddenApprover", "PARTIAL", 90, "New this session"],
  172: ["Financial-impact recorded", "financialImpact on metadata", "approval.js", "PARTIAL", 80, "Bridge test EUR 0"],
  173: ["Action input hashes", "hashInput bind", "pusat/hash.js", "PARTIAL", 90, "input_changed cancels"],
  174: ["Approval expiration", "expireDue", "approval.js", "PARTIAL", 85, "Unit expired"],
  175: ["Replay protection", "Second decide duplicate", "approval.js", "PARTIAL", 85, "Unit duplicate"],
  176: ["Audit trails", "controlCenter.recordSystemEvent", "controlCenter", "PARTIAL", 75, "Events on create/decide"],
  177: ["Controlled execution", "assertBound before execute", "approval.assertBound", "PARTIAL", 80, "Software gate; no live execute"],
  178: ["AI cannot self-approve", "requestingAgent match rejected", "approval.decide", "PARTIAL", 90, "New unit"],
  179: ["Pending-action list", "listApprovals PENDING", "controlCenter.listApprovals", "PARTIAL", 75, "API + admin UI"],
  180: ["Revalidate before execute", "assertBound hash check", "approval.js", "PARTIAL", 80, "Unit"],
  181: ["Control Center = Pusat approval", "No unbound insert path", "controlCenter.createApproval", "PARTIAL", 85, "Delegated"],
  182: ["High-impact gated actions catalog", "Sales, SoT, live pay, PO, listing, ship, deploy", "docs + flags", "HUMAN_APPROVAL_REQUIRED", 60, "Workflow implemented; actions pending"],
  183: ["Structured logs", "securityLog + correlation", "securityLog.js", "PARTIAL", 65, "Events; not a full log pipeline"],
  184: ["Metrics", "Limited local counters", "productionHealth", "PARTIAL", 40, "No Prometheus LIVE"],
  185: ["Alerting", "Not a live pager", "ops", "BLOCKED_EXTERNAL_DEPENDENCY", 20, "No authorized alerting backend"],
  186: ["Backup", "scripts/backup-db.mjs", "backup-db.mjs", "PARTIAL", 60, "Local script; production backup UNKNOWN"],
  187: ["Restore", "restore-db.mjs --dry-run", "restore-db.mjs", "PARTIAL", 55, "Dry-run script; production restore HUMAN"],
  188: ["Persistence design", "Intended durable disk not /tmp", "dbPaths, RENDER docs", "PARTIAL", 78, "2026-10-16: live disk /var/data + /tmp fail-closed tests; restart-survival remaining"],
  189: ["Recovery", "Local operations pack", "ops:local", "PARTIAL", 40, "Not disaster-tested"],
  190: ["Incident evidence", "Reports in docs/software-completion", "docs", "PARTIAL", 70, "This register"],
  191: ["Operational diagnostics", "provider-diagnostics, health", "scripts", "PARTIAL", 75, "Secret-free inventory; dry-run 2026-10-16 attempted:false"],
  192: ["Correlation IDs", "X-Request-Id", "correlationContext", "PARTIAL", 75, "API headers"],
  193: ["Security event log", "logSecurityEvent rate limit + guardian", "securityLog.js", "PARTIAL", 70, "Local"],
  194: ["Health / software report", "/api/health/software", "softwareCompletionPlugin", "PARTIAL", 70, "salesEnabled false"],
  195: ["No /tmp as durable app store", "Policy + dbPaths", "dbPaths.js", "PARTIAL", 80, "Honored; tests use server/data/test-scratch"],
  196: ["Unit tests", "vitest run", "package.json test:unit", "PARTIAL", 80, "Focused suite this session; full suite recorded in TEST_EVIDENCE"],
  197: ["Integration tests", "software + commerce", "test:software", "PARTIAL", 70, "Historical + this pass subset"],
  198: ["API security tests", "fortressAuthz, csrf, cors, guest", "server/__tests__", "PARTIAL", 80, "This session"],
  199: ["E2E tests", "Playwright", "e2e/", "PARTIAL", 70, "Last isolated: 100/6/13; rate limit + cookie + PIM copy"],
  200: ["Regression tests", "Locked manifests on other branches", "final-regression", "PARTIAL", 40, "Not re-run full regression this session"],
  201: ["Load-related safe checks", "Rate limiter unit", "rateLimitStore.test.mjs", "PARTIAL", 68, "2026-10-16 burst tests; no production load test"],
  202: ["Production build", "next build isolated", "package.json build", "PARTIAL", 80, "Prior isolated production export 2044 pages; not rebuilt this pass unless recorded"],
  203: ["Lint", "next lint", "package.json lint", "PARTIAL", 50, "Run when recorded in TEST_EVIDENCE"],
  204: ["Typecheck", "tsc --noEmit", "package.json typecheck", "PARTIAL", 50, "Run when recorded"],
  205: ["Release quality", "CI UNKNOWN for PR head vs local", "GitHub", "PARTIAL", 100, "2026-10-16: PR #431 Actions run 38958546249 quality/e2e SUCCESS; original UNKNOWN so not VERIFIED_100"],
  206: ["CSRF and CORS tests", "csrf.test.mjs corsOrigins", "tests", "PARTIAL", 85, "Prior + this register"],
  207: ["Finance and idempotency tests", "fortressAuthz / dualPayment", "tests", "PARTIAL", 80, "409 provider required"],
  208: ["Human approval tests", "pusatApprovalExceptions, controlCenter bridge", "tests", "PARTIAL", 90, "Self-approve test added"],
  209: ["Authz and IDOR tests", "guestCommerceAccess", "tests", "PARTIAL", 85, "Passed locally"],
  210: ["Dependency audit", "npm audit --audit-level=high", "security:audit", "PARTIAL", 62, "2026-10-16: 5 high braces via eslint-config-next; no force upgrade"],
  211: ["Backup/restore tests", "test:backup-restore dry-run", "scripts", "PARTIAL", 76, "2026-10-16 dry-run + backupRestoreIntegrity; not production RESTORE_TESTED"],
  212: ["CI evidence", "PR #430 checks", "GitHub", "PARTIAL", 100, "2026-10-16: #430 Checks SUCCESS on SHA b9d3ae8 (same as #431 run); original UNKNOWN so not VERIFIED_100"],
  213: ["Production environment configuration", "Cannot change production env", "safety", "HUMAN_APPROVAL_REQUIRED", 30, "Readiness checks only"],
  214: ["Deployment preparation", "Scripts exist; no deploy", "start-production, render", "HUMAN_APPROVAL_REQUIRED", 40, "No deploy this session"],
  215: ["External integrations inventory", "externalIntegrations.js", "software/externalIntegrations.js", "PARTIAL", 50, "Secret-free; live BLOCKED"],
  216: ["Secrets handling", "No secrets in git", "policy", "PARTIAL", 70, "This session did not print secrets"],
  217: ["Monitoring", "Local health only", "ops", "PARTIAL", 100, "2026-10-16: operator GET /api/health persistent true / render_persistent_disk; original UNKNOWN so not VERIFIED_100"],
  218: ["Commercial readiness", "Sales off is truthful catalog mode", "salesMode", "PARTIAL", 70, "Ready to stay off until HUMAN"],
  219: ["Launch controls", "goLiveApproval", "goLiveApproval.js", "HUMAN_APPROVAL_REQUIRED", 50, "Approve path exists; not executed live"],
  220: ["Render persistence", "Prior proof branch; this HEAD UNKNOWN", "docs RENDER", "PARTIAL", 100, "2026-10-16: disk 1GB mount /var/data + live persistent health; original UNKNOWN so not VERIFIED_100"],
  221: ["DNS and access policy", "No live DNS change", "safety", "HUMAN_APPROVAL_REQUIRED", 0, "Not touched"],
  222: ["Go-live verify script", "verify-go-live.mjs", "scripts", "PARTIAL", 50, "Script exists; live URL not hit"],
  223: ["Provider diagnostics", "provider-diagnostics.mjs", "scripts", "PARTIAL", 50, "Secret-free"],
  224: ["Production safety script", "production-safety.mjs", "scripts", "PARTIAL", 60, "Local /api/commerce/status"],
  225: ["First real customer order", "Irreversible", "safety", "HUMAN_APPROVAL_REQUIRED", 0, "Not executed"],
  226: ["Merge and production deploy", "Forbidden without human", "git/PR", "HUMAN_APPROVAL_REQUIRED", 0, "Feature-branch PR only; no merge"],
  227: ["Threat detection (safe)", "Guardian DANGEROUS_PATTERN", "pusat/guardian.js", "PARTIAL", 75, "Detect + deny; no destructive containment"],
  228: ["Authorization enforcement (Guardian)", "aiCanExecute", "guardian.js", "PARTIAL", 80, "Permission deny"],
  229: ["Anomaly detection", "Rate + dangerous pattern", "guardian.js", "PARTIAL", 55, "Heuristic only; not ML production"],
  230: ["Security telemetry", "guardian.deny events", "controlCenter + securityLog", "PARTIAL", 70, "Local events"],
  231: ["Containment safeguards", "Deny/fail-closed only; no autonomous destructive containment", "guardian.js", "PARTIAL", 70, "No kill-switch of prod infra"],
  232: ["Auditability", "guardian.allow/deny system events", "controlCenter", "PARTIAL", 75, "actor esat_bey recorded"],
  233: ["Agent isolation", "Tool allow-list + identity required", "guardian.evaluateUnsafe", "PARTIAL", 80, "Missing agentId fail-closed"],
  234: ["Incident response playbooks", "Docs + deny path", "docs GUARDIAN_DE", "PARTIAL", 40, "No live IR drill"],
  235: ["Secret scanning in Guardian", "scanSecrets", "guardian.js", "PARTIAL", 80, "Rejects password/token keys"],
  236: ["Dangerous pattern block", "purchase/refund/wire/drop table", "DANGEROUS_PATTERN", "PARTIAL", 75, "Require approval / deny"],
  237: ["Guardian evaluation fail-closed", "evaluate() catches and denies", "guardian.evaluate", "PARTIAL", 85, "failClosed true on throw"],
};

function bandOf(n) {
  return BANDS.find(([a, b]) => n >= a && n <= b);
}

function itemBlock(n) {
  const row = SCOPES[n];
  if (!row) throw new Error(`missing scope ${n}`);
  const [scope, criteria, files, state, pct, remaining] = row;
  const band = bandOf(n);
  const prod =
    state === "HUMAN_APPROVAL_REQUIRED" || state === "BLOCKED_EXTERNAL_DEPENDENCY"
      ? "UNKNOWN"
      : "UNKNOWN";
  const tests =
    n <= 19 || n === 41 || n === 12 || n === 171 || n === 178 || n === 208
      ? "Focused vitest this session (see BUZZARD_237_TEST_EVIDENCE.md)"
      : "See TEST_EVIDENCE; not every item re-executed this session";
  const humanHint = /HUMAN|BLOCKED_EXTERNAL|deploy|live|SoT|listing|order|pay/i.test(
    scope + remaining + state
  )
    ? "See HUMAN_APPROVAL_BLOCKERS.md if state is HUMAN or BLOCKED"
    : "None beyond standing safety locks";
  return `### Item ${n}

| Field | Value |
| --- | --- |
| Original title | **UNKNOWN** — canonical numbered 237-item checklist file was not found in this repository or \`docs/software-completion\` |
| Title source | SCOPE_ESTABLISHED_FROM_DIRECTIVE_CATEGORY_BAND (${band[0]}–${band[1]}) |
| Established scope | ${scope} |
| Original acceptance criteria | **UNKNOWN as authored.** Established criteria: ${criteria} |
| Current implementation status | ${state} |
| Existing implementation evidence | ${files} |
| Identified gaps | ${remaining} |
| Required changes | Complete remaining local software without enabling sales/SoT/live payments; record human/external blockers |
| Files and modules involved | ${files} |
| Security and data-integrity implications | Must not weaken auth, CSRF, CORS, rate limits, finance locks, or approval gates |
| Dependencies | Previous items in band ${band[0]}–${band[1]}; commercial children depend on item 12 flags remaining off |
| Human approval requirements | ${humanHint} |
| Tests required | Meaningful unit/integration covering the established criteria |
| Exact tests executed and results | ${tests} |
| Integration status | ADAPTER_IMPLEMENTED or MOCK_OR_SIMULATED unless noted; **LIVE_VERIFIED never claimed** |
| Sandbox verification status | UNKNOWN unless a named sandbox test is in TEST_EVIDENCE |
| Production verification status | ${prod} |
| Completion percentage | ${pct}% (established-criteria weighting; original unknown criteria cannot be 100%) |
| Remaining work | ${remaining} |
| Final evidence references | \`docs/software-completion/BUZZARD_237_TEST_EVIDENCE.md\`; HEAD working tree after this pass |
| Final state and date | ${state} / ${DATE} |
`;
}

function counts(items) {
  const c = {};
  for (const it of items) c[it] = (c[it] || 0) + 1;
  return c;
}

const states = [];
let pctSum = 0;
for (let n = 1; n <= 237; n++) {
  states.push(SCOPES[n][3]);
  pctSum += SCOPES[n][4];
}
const c = counts(states);
const avg = (pctSum / 237).toFixed(1);

const header = `# Buzzard 237 Master Execution Register

Date: ${DATE}  
Branch: \`cursor/software-completion-local-c293\`  
Inspected ancestor HEAD: \`5ba16b2\` plus working-tree changes in this pass  
Mode: LOCAL SOFTWARE IMPLEMENTATION + EVIDENCE  
Sales / Product SoT / live payments: **remain OFF**

## Canonical source status

The directive requires preserving the original 237-item numbering, wording, order, and acceptance criteria.

**Search result:** no file in this repository contains a numbered Buzzard software checklist with items 1 through 237. Matches for "237" are GitHub PR #237, EAN \`4006633001237\`, and unrelated commit SHAs. \`FINAL_MASTER_CHECKLIST.md\` is a short unchecked architecture list. Historical phase reports are not a 237-item source.

Therefore:

- Original titles: **UNKNOWN**
- Original acceptance criteria: **UNKNOWN**
- Item numbers 1–237 are retained in order
- Established scope is taken only from directive section C category bands plus inspectable code
- No item is labeled VERIFIED_100 solely because code exists
- Nothing is LIVE_VERIFIED

## Summary (established-scope scoring, not original-criteria 100%)

| State | Count | % of 237 |
| --- | --- | --- |
| VERIFIED_100 | ${c.VERIFIED_100 || 0} | ${(((c.VERIFIED_100 || 0) / 237) * 100).toFixed(1)}% |
| PARTIAL | ${c.PARTIAL || 0} | ${(((c.PARTIAL || 0) / 237) * 100).toFixed(1)}% |
| HUMAN_APPROVAL_REQUIRED | ${c.HUMAN_APPROVAL_REQUIRED || 0} | ${(((c.HUMAN_APPROVAL_REQUIRED || 0) / 237) * 100).toFixed(1)}% |
| BLOCKED_EXTERNAL_DEPENDENCY | ${c.BLOCKED_EXTERNAL_DEPENDENCY || 0} | ${(((c.BLOCKED_EXTERNAL_DEPENDENCY || 0) / 237) * 100).toFixed(1)}% |
| BLOCKED_AUTHORIZATION | ${c.BLOCKED_AUTHORIZATION || 0} | ${(((c.BLOCKED_AUTHORIZATION || 0) / 237) * 100).toFixed(1)}% |
| BLOCKED_SECURITY | ${c.BLOCKED_SECURITY || 0} | ${(((c.BLOCKED_SECURITY || 0) / 237) * 100).toFixed(1)}% |
| NOT_IMPLEMENTED | ${c.NOT_IMPLEMENTED || 0} | ${(((c.NOT_IMPLEMENTED || 0) / 237) * 100).toFixed(1)}% |
| NOT_APPLICABLE_WITH_EVIDENCE | ${c.NOT_APPLICABLE_WITH_EVIDENCE || 0} | ${(((c.NOT_APPLICABLE_WITH_EVIDENCE || 0) / 237) * 100).toFixed(1)}% |
| NOT_STARTED | 0 | 0.0% |

Mean established-scope completion: **${avg}%**. This is not 237/237 done.

## Safety locks this workspace

- \`BUZZARD_SALES_ENABLED\` is not \`1\`
- \`BUZZARD_PRODUCT_SOT_ACTIVE\` is not treated as active in software (\`productSourceOfTruthActive: false\`)
- \`BUZZARD_LIVE_PAYMENTS\` effective flag is false without sales
- No production probe, deploy, merge, live payment, PO, listing, or carrier purchase

## Software implemented this pass (in-order gaps)

1. Feature-flag parent/child now includes \`BUZZARD_LIVE_PAYMENTS\` and \`BUZZARD_PRODUCT_SOT_ACTIVE\` (SoT stays software-inactive).
2. Production environment validation errors when live payments are armed without sales.
3. Payment diagnostics report **effective** flags, not raw env.
4. Human Approval Center rejects AI self-approval and missing approver identity.
5. \`/api/health*\` uses a separate still-enabled rate-limit bucket so probes do not share the global \`api:\` 180/min bucket. Rate limiting is **not** disabled.

---

`;

let body = header;
for (const [a, b, title] of BANDS) {
  body += `## Items ${a}–${b}: ${title}\n\n`;
  for (let n = a; n <= b; n++) body += itemBlock(n) + "\n";
}

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "BUZZARD_237_MASTER_EXECUTION_REGISTER.md"), body);
console.log("wrote register", body.length, "bytes", "avg", avg, "states", c);
`;