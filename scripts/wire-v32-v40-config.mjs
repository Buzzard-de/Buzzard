#!/usr/bin/env node
import fs from "fs";
import path from "path";

const ROOT = path.resolve(import.meta.dirname, "..");

const MODULES = [
  { versionShort: "3.2", title: "Order Management System", slug: "order-management-v32", camel: "orderManagementV32", Pascal: "OrderManagementV32", prefix: "oms32", envSnake: "ORDER_MANAGEMENT_V32", navLabel: "OMS v3.2" },
  { versionShort: "3.3", title: "Fulfillment & Warehouse", slug: "fulfillment-v33", camel: "fulfillmentV33", Pascal: "FulfillmentV33", prefix: "ful33", envSnake: "FULFILLMENT_V33", navLabel: "Fulfill v3.3" },
  { versionShort: "3.4", title: "Logistics & Shipping", slug: "logistics-v34", camel: "logisticsV34", Pascal: "LogisticsV34", prefix: "log34", envSnake: "LOGISTICS_V34", navLabel: "Logistics v3.4" },
  { versionShort: "3.5", title: "Marketplace Integration", slug: "marketplace-v35", camel: "marketplaceV35", Pascal: "MarketplaceV35", prefix: "mkt35", envSnake: "MARKETPLACE_V35", navLabel: "Market v3.5" },
  { versionShort: "3.6", title: "Payments & Finance", slug: "payments-v36", camel: "paymentsV36", Pascal: "PaymentsV36", prefix: "pay36", envSnake: "PAYMENTS_V36", navLabel: "Pay v3.6" },
  { versionShort: "3.7", title: "Europe & International", slug: "international-v37", camel: "internationalV37", Pascal: "InternationalV37", prefix: "int37", envSnake: "INTERNATIONAL_V37", navLabel: "Intl v3.7" },
  { versionShort: "3.8", title: "Security & Compliance", slug: "security-v38", camel: "securityV38", Pascal: "SecurityV38", prefix: "sec38", envSnake: "SECURITY_V38", navLabel: "Security v3.8" },
  { versionShort: "3.9", title: "Analytics & BI", slug: "analytics-v39", camel: "analyticsV39", Pascal: "AnalyticsV39", prefix: "anl39", envSnake: "ANALYTICS_V39", navLabel: "Analytics v3.9" },
  { versionShort: "4.0", title: "Master Admin & Platform Control", slug: "master-admin-v40", camel: "masterAdminV40", Pascal: "MasterAdminV40", prefix: "mad40", envSnake: "MASTER_ADMIN_V40", navLabel: "Master v4.0" },
];

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function write(rel, content) {
  fs.writeFileSync(path.join(ROOT, rel), content);
  console.log("updated", rel);
}

// aiAutomationPlugin.js
{
  const file = "server/plugins/aiAutomationPlugin.js";
  let content = read(file);
  const insertBeforeReturn = MODULES.map(
    (m) => `  let ${m.camel} = { enabled: false };
  if (process.env.BUZZARD_${m.envSnake} !== "0" && process.env.BUZZARD_DB_ENABLED !== "0") {
    try {
      ${m.camel} = {
        enabled: true,
        ...require("../lib/${m.camel}").get${m.Pascal}Status(),
      };
    } catch (error) {
      ${m.camel} = { enabled: true, error: error.message };
    }
  }
`
  ).join("\n");

  content = content.replace(
    "  let productCatalogPim = { enabled: false };",
    `  let productCatalogPim = { enabled: false };`
  );

  if (!content.includes("orderManagementV32")) {
    content = content.replace(
      "  return {\n    status: \"ok\",",
      `${insertBeforeReturn}\n  return {\n    status: \"ok\",`
    );
    const returnKeys = MODULES.map((m) => `    ${m.camel},`).join("\n");
    content = content.replace(
      "    productCatalogPim,\n    integrations:",
      `    productCatalogPim,\n${returnKeys}\n    integrations:`
    );
    write(file, content);
  }
}

// AdminShell.tsx
{
  const file = "components/admin/AdminShell.tsx";
  let content = read(file);
  if (!content.includes("order-management-v32")) {
    const navEntries = MODULES.map(
      (m) => `  { href: "/admin/${m.slug}/", label: "${m.navLabel}" },`
    ).join("\n");
    content = content.replace(
      '  { href: "/admin/product-catalog-pim/", label: "PIM v3.0" },',
      `  { href: "/admin/product-catalog-pim/", label: "PIM v3.0" },\n${navEntries}`
    );
    write(file, content);
  }
}

// lib/api/config.ts
{
  const file = "lib/api/config.ts";
  let content = read(file);
  if (!content.includes("ORDER_MANAGEMENT_V32")) {
    const fns = MODULES.map(
      (m) => `export function is${m.Pascal}Enabled(): boolean {
  if (process.env.NEXT_PUBLIC_${m.envSnake} === "0") return false;
  if (process.env.NEXT_PUBLIC_${m.envSnake} === "1") return isApiConfigured();
  return isApiConfigured();
}
`
    ).join("\n");
    content = content.replace(
      "export function isProductionBuild(): boolean {",
      `${fns}\nexport function isProductionBuild(): boolean {`
    );
    write(file, content);
  }
}

// .env.example
{
  const file = ".env.example";
  let content = read(file);
  if (!content.includes("NEXT_PUBLIC_ORDER_MANAGEMENT_V32")) {
    const pub = MODULES.map((m) => `NEXT_PUBLIC_${m.envSnake}=1`).join("\n");
    const srv = MODULES.map((m) => `BUZZARD_${m.envSnake}=1`).join("\n");
    content = content.replace(
      "NEXT_PUBLIC_PRODUCT_CATALOG_PIM=1",
      `NEXT_PUBLIC_PRODUCT_CATALOG_PIM=1\n${pub}`
    );
    content = content.replace(
      "BUZZARD_PRODUCT_CATALOG_PIM=1",
      `BUZZARD_PRODUCT_CATALOG_PIM=1\n${srv}`
    );
    write(file, content);
  }
}

// deploy-pages.yml
{
  const file = ".github/workflows/deploy-pages.yml";
  let content = read(file);
  if (!content.includes("NEXT_PUBLIC_ORDER_MANAGEMENT_V32")) {
    const vars = MODULES.map((m) => `          NEXT_PUBLIC_${m.envSnake}: "1"`).join("\n");
    content = content.replace(
      '          NEXT_PUBLIC_PRODUCT_CATALOG_PIM: "1"',
      `          NEXT_PUBLIC_PRODUCT_CATALOG_PIM: "1"\n${vars}`
    );
    write(file, content);
  }
}

// render.yaml
{
  const file = "render.yaml";
  let content = read(file);
  if (!content.includes("BUZZARD_ORDER_MANAGEMENT_V32")) {
    const vars = MODULES.map(
      (m) => `      - key: BUZZARD_${m.envSnake}\n        value: "1"`
    ).join("\n");
    content = content.replace(
      '      - key: BUZZARD_PRODUCT_CATALOG_PIM\n        value: "1"',
      `      - key: BUZZARD_PRODUCT_CATALOG_PIM\n        value: "1"\n${vars}`
    );
    write(file, content);
  }
}

// render-bootstrap.mjs
{
  const file = "scripts/render-bootstrap.mjs";
  let content = read(file);
  if (!content.includes("BUZZARD_ORDER_MANAGEMENT_V32")) {
    const vars = MODULES.map(
      (m) => `  { key: "BUZZARD_${m.envSnake}", value: "1" },`
    ).join("\n");
    content = content.replace(
      '  { key: "BUZZARD_PRODUCT_CATALOG_PIM", value: "1" },',
      `  { key: "BUZZARD_PRODUCT_CATALOG_PIM", value: "1" },\n${vars}`
    );
    write(file, content);
  }
}

// README.md
{
  const file = "server/plugins/README.md";
  let content = read(file);
  if (!content.includes("Order Management v3.2")) {
    const sections = MODULES.map(
      (m) => `## ${m.title} Plugin (v${m.versionShort})

The \`${m.camel}Plugin.js\` module adds ${m.title.toLowerCase()} foundations:

- \`POST|GET /api/${m.slug}/records\` — module records
- \`GET /api/${m.slug}/records/:code\` — record lookup
- \`PATCH /api/${m.slug}/records/:id\` — update record
- \`POST|GET /api/${m.slug}/jobs\` — background jobs
- \`GET /api/admin/${m.slug}/overview\` — admin dashboard

Requires SQLite (\`BUZZARD_DB_ENABLED=1\`). Disable with \`BUZZARD_${m.envSnake}=0\`.
Tables: \`${m.prefix}_records\`, \`${m.prefix}_jobs\`.
Frontend admin: \`/admin/${m.slug}/\`. Set \`NEXT_PUBLIC_${m.envSnake}=1\`.
`
    ).join("\n");
    content = content.replace(
      "## Plugin hinzufügen",
      `${sections}\n## Plugin hinzufügen`
    );
    write(file, content);
  }
}

console.log("Config wiring complete");
