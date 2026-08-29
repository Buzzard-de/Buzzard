/** Buzzard Core Foundation — shared constants (Part 1 + Part 2). */

const SERVICE_STATUS = Object.freeze({
  ONLINE: "ONLINE",
  WARNING: "WARNING",
  OFFLINE: "OFFLINE",
  UNKNOWN: "UNKNOWN",
});

const AI_EMPLOYEE_STATUS = Object.freeze({
  ACTIVE: "ACTIVE",
  PAUSED: "PAUSED",
  DISABLED: "DISABLED",
  ERROR: "ERROR",
});

const TASK_PRIORITY = Object.freeze({
  CRITICAL: "CRITICAL",
  HIGH: "HIGH",
  NORMAL: "NORMAL",
  LOW: "LOW",
});

const TASK_STATUS = Object.freeze({
  PENDING: "PENDING",
  ASSIGNED: "ASSIGNED",
  RUNNING: "RUNNING",
  WAITING_APPROVAL: "WAITING_APPROVAL",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
});

const CATEGORY_VISIBILITY = Object.freeze({
  ACTIVE: "ACTIVE",
  HIDDEN: "HIDDEN",
  COMING_SOON: "COMING_SOON",
  DRAFT: "DRAFT",
});

const READINESS_STATUS = Object.freeze({
  READY: "READY",
  NOT_READY: "NOT_READY",
  BLOCKED: "BLOCKED",
});

const RISK_LEVEL = Object.freeze({
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
});

const INTEGRATION_STATUS = Object.freeze({
  CONNECTED: "CONNECTED",
  DISCONNECTED: "DISCONNECTED",
  ERROR: "ERROR",
  DISABLED: "DISABLED",
});

const DEFAULT_AI_EMPLOYEES = [
  {
    id: "product_ai",
    name: "Product AI",
    department: "Catalog",
    description: "Product enrichment and validation",
    responsibility: "Product data quality",
    permissions: ["products.read", "products.write", "ai.execute"],
    capabilities: ["enrichment", "validation", "translation"],
    priority: 80,
  },
  {
    id: "price_ai",
    name: "Price AI",
    department: "Commerce",
    description: "Price monitoring and anomaly detection",
    responsibility: "Pricing intelligence",
    permissions: ["products.read", "prices.read", "prices.update", "ai.execute"],
    capabilities: ["price_check", "anomaly_detection"],
    priority: 70,
  },
  {
    id: "category_ai",
    name: "Category AI",
    department: "Catalog",
    description: "Category mapping and taxonomy",
    responsibility: "Category intelligence",
    permissions: ["categories.read", "categories.write", "ai.execute"],
    capabilities: ["taxonomy", "mapping"],
    priority: 65,
  },
  {
    id: "order_ai",
    name: "Order AI",
    department: "Operations",
    description: "Order preparation (catalog mode — no real dispatch)",
    responsibility: "Order prep workflows",
    permissions: ["orders.read", "orders.write", "ai.execute"],
    capabilities: ["order_prep", "validation"],
    priority: 60,
  },
  {
    id: "security_ai",
    name: "Security AI",
    department: "Security",
    description: "Security monitoring and alerts",
    responsibility: "Security events",
    permissions: ["security.read", "security.alert", "ai.execute"],
    capabilities: ["monitoring", "alerting"],
    priority: 90,
  },
];

module.exports = {
  SERVICE_STATUS,
  AI_EMPLOYEE_STATUS,
  TASK_PRIORITY,
  TASK_STATUS,
  CATEGORY_VISIBILITY,
  READINESS_STATUS,
  RISK_LEVEL,
  INTEGRATION_STATUS,
  DEFAULT_AI_EMPLOYEES,
};
