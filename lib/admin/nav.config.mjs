/** Shared admin navigation – used by AdminShell and verify-go-live.mjs */

export const ADMIN_NAV_GROUPS = [
  {
    id: "overview",
    label: "Übersicht",
    items: [
      { slug: "", label: "Dashboard" },
      { slug: "analytics-dashboard", label: "Executive KPIs" },
      { slug: "master-admin-v40", label: "Master v4.0" },
    ],
  },
  {
    id: "catalog",
    label: "Katalog",
    items: [
      { slug: "products", label: "Produkte" },
      { slug: "catalog", label: "Katalog & SEO" },
      { slug: "pim-catalog", label: "PIM v1.9" },
      { slug: "product-catalog-pim", label: "PIM v3.0" },
      { slug: "seo", label: "SEO" },
    ],
  },
  {
    id: "commerce",
    label: "Commerce",
    items: [
      { slug: "orders", label: "Bestellungen" },
      { slug: "order-management", label: "OMS v2.2" },
      { slug: "order-management-v32", label: "OMS v3.2" },
      { slug: "cart-checkout", label: "Cart v2.3" },
      { slug: "customer-checkout", label: "Checkout" },
      { slug: "returns-rma", label: "RMA v2.5" },
      { slug: "payments-finance", label: "Finance v2.1" },
      { slug: "payments-v36", label: "Pay v3.6" },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    items: [
      { slug: "marketing-center", label: "Marketing Center" },
      { slug: "marketing-loyalty", label: "Mktg v2.6" },
      { slug: "reviews-ratings", label: "Reviews v2.7" },
      { slug: "marketplace-hub", label: "Marketplace Hub" },
      { slug: "marketplace-v35", label: "Market v3.5" },
    ],
  },
  {
    id: "crm",
    label: "CRM & Support",
    items: [
      { slug: "crm-customer-service", label: "CRM v2.4" },
      { slug: "crm-loyalty", label: "CRM & Loyalty" },
      { slug: "customer-support", label: "Support" },
      { slug: "contact-submissions", label: "Kontakt" },
    ],
  },
  {
    id: "logistics",
    label: "Logistik",
    items: [
      { slug: "logistics", label: "Logistik" },
      { slug: "logistics-fulfillment", label: "Logistics v1.7" },
      { slug: "fulfillment-v33", label: "Fulfill v3.3" },
      { slug: "logistics-v34", label: "Logistics v3.4" },
      { slug: "wms-inventory", label: "WMS v1.8" },
    ],
  },
  {
    id: "suppliers",
    label: "Lieferanten",
    items: [
      { slug: "suppliers", label: "Lieferanten" },
      { slug: "supplier-hub", label: "Supplier Hub" },
      { slug: "supplier-integration-hub", label: "Supplier v3.1" },
      { slug: "sync", label: "Sync & Import" },
      { slug: "integrations", label: "Integrations" },
    ],
  },
  {
    id: "platform",
    label: "Plattform",
    items: [
      { slug: "analytics", label: "Analytics" },
      { slug: "analytics-v39", label: "Analytics v3.9" },
      { slug: "identity-security", label: "Security v2.0" },
      { slug: "security-v38", label: "Security v3.8" },
      { slug: "international-v37", label: "Intl v3.7" },
      { slug: "ai-center", label: "AI v2.8" },
      { slug: "advanced-search", label: "Search v2.9" },
      { slug: "localization", label: "Localization" },
      { slug: "automation", label: "Automation" },
    ],
  },
];

/** Slugs checked by verify-go-live (includes login, excludes duplicate dashboard slug). */
export const ADMIN_ROUTE_SLUGS = [
  "login",
  ...ADMIN_NAV_GROUPS.flatMap((group) => group.items.map((item) => item.slug)).filter(Boolean),
];

export function adminHref(slug) {
  return slug ? `/admin/${slug}/` : "/admin/";
}
