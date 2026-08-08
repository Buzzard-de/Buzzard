const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..", "..");
const dataDir = path.join(__dirname, "..", "data");
const ordersFile = path.join(dataDir, "orders.json");
const customersFile = path.join(dataDir, "customers.json");
const productsFile = path.join(rootDir, "data", "buzzard_products.json");
const categoriesFile = path.join(rootDir, "data", "buzzard_categories.json");
const returnsFile = path.join(dataDir, "return-requests.json");
const fulfillmentsFile = path.join(dataDir, "fulfillments.json");
const supplierOrdersFile = path.join(dataDir, "supplier-orders.json");

const TZ = "Europe/Berlin";
const LOW_STOCK_THRESHOLD = Number(process.env.BUZZARD_LOW_STOCK_THRESHOLD || 5);

function readJson(file, fallback = []) {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8") || (Array.isArray(fallback) ? "[]" : "{}"));
  } catch {
    return fallback;
  }
}

function berlinDateKey(dateInput) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(dateInput));
}

function berlinMonthKey(dateInput) {
  const key = berlinDateKey(dateInput);
  return key.slice(0, 7);
}

function addDaysToDateKey(dateKey, days) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function resolveRange(preset = "last_30_days", from, to) {
  const today = berlinDateKey(new Date());
  let start = today;
  let end = today;

  switch (preset) {
    case "today":
      break;
    case "yesterday":
      start = addDaysToDateKey(today, -1);
      end = start;
      break;
    case "last_7_days":
      start = addDaysToDateKey(today, -6);
      break;
    case "last_30_days":
      start = addDaysToDateKey(today, -29);
      break;
    case "month_to_date": {
      start = `${today.slice(0, 7)}-01`;
      break;
    }
    case "previous_month": {
      const [y, m] = today.split("-").map(Number);
      const prevStart = new Date(Date.UTC(y, m - 2, 1));
      const prevEnd = new Date(Date.UTC(y, m - 1, 0));
      start = prevStart.toISOString().slice(0, 10);
      end = prevEnd.toISOString().slice(0, 10);
      break;
    }
    case "year_to_date":
      start = `${today.slice(0, 4)}-01-01`;
      break;
    case "custom":
      start = from || today;
      end = to || today;
      break;
    default:
      start = addDaysToDateKey(today, -29);
  }

  if (start > end) [start, end] = [end, start];
  return { preset, start, end, timezone: TZ };
}

function inRange(isoDate, range) {
  const key = berlinDateKey(isoDate);
  return key >= range.start && key <= range.end;
}

function loadOrders() {
  return readJson(ordersFile, []);
}

function loadCustomers() {
  return readJson(customersFile, []);
}

function loadProducts() {
  const doc = readJson(productsFile, { products: [] });
  const map = new Map();
  for (const product of doc.products || []) {
    map.set(product.id, product);
  }
  return map;
}

function loadCategoryIndex() {
  const doc = readJson(categoriesFile, { categories: [] });
  const map = new Map();
  function walk(nodes, parentId = null) {
    for (const node of nodes || []) {
      map.set(node.id, { id: node.id, name: node.name, level: node.level, parentId });
      walk(node.children, node.id);
    }
  }
  walk(doc.categories);
  return map;
}

function mainCategoryId(categoryId, categoryIndex) {
  let current = categoryIndex.get(categoryId);
  while (current && current.level > 1 && current.parentId) {
    current = categoryIndex.get(current.parentId);
  }
  return current?.id || categoryId;
}

function paidOrders(orders) {
  return orders.filter((o) => !["cancelled"].includes(o.status));
}

function filterOrders(range) {
  return paidOrders(loadOrders()).filter((o) => inRange(o.createdAt, range));
}

function sum(arr, fn) {
  return arr.reduce((acc, item) => acc + fn(item), 0);
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function estimateLineCost(line, productsById) {
  const product = productsById.get(line.productId);
  const supplierCost = product?.supplier_price?.amount || 0;
  return supplierCost * (line.qty || 1);
}

function estimateLineRevenue(line) {
  return line.lineTotal || (line.unitPrice || 0) * (line.qty || 1);
}

function roleSections(role) {
  if (role === "administrator") {
    return new Set(["overview", "sales", "products", "categories", "customers", "inventory", "suppliers", "finance", "returns"]);
  }
  if (role === "order_manager") {
    return new Set(["overview", "sales", "customers", "suppliers", "returns"]);
  }
  if (role === "catalog_manager") {
    return new Set(["overview", "products", "categories", "inventory", "suppliers"]);
  }
  return new Set(["overview", "sales", "products", "categories", "inventory"]);
}

function canSeeFinance(role) {
  return role === "administrator";
}

function canSeeSupplierCosts(role) {
  return role === "administrator";
}

function computeOverview(range, role) {
  const orders = filterOrders(range);
  const customers = loadCustomers();
  const productsById = loadProducts();
  const returns = readJson(returnsFile, []).filter((r) => inRange(r.createdAt, range));
  const revenue = sum(orders, (o) => o.total || 0);
  const discounts = sum(orders, (o) => o.discount || 0);
  const shippingRevenue = sum(orders, (o) => o.shipping || 0);
  const unitsSold = sum(orders, (o) => sum(o.lines || [], (l) => l.qty || 0));
  const refunds = orders.filter((o) => o.status === "refunded").length;
  const newCustomers = customers.filter((c) => inRange(c.createdAt, range)).length;
  const lowStock = [...productsById.values()].filter(
    (p) => p.status === "active" && (p.stock_status === "low_stock" || (p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD))
  ).length;
  const outOfStock = [...productsById.values()].filter((p) => p.status === "active" && p.stock_status === "out_of_stock").length;

  let estimatedGrossProfit = null;
  if (canSeeFinance(role)) {
    const cogs = sum(orders, (o) => sum(o.lines || [], (l) => estimateLineCost(l, productsById)));
    estimatedGrossProfit = round2(revenue - discounts - cogs);
  }

  return {
    range,
    kpis: {
      revenue: round2(revenue),
      orders: orders.length,
      averageOrderValue: orders.length ? round2(revenue / orders.length) : 0,
      unitsSold,
      newCustomers,
      conversionRate: null,
      refunds,
      shippingRevenue: round2(shippingRevenue),
      estimatedGrossProfit,
      stockAlerts: lowStock + outOfStock,
      lowStock,
      outOfStock,
      discounts: round2(discounts),
    },
    notes: {
      estimatedGrossProfit: canSeeFinance(role)
        ? "analytics.finance.estimatedProfitNote"
        : "analytics.finance.hidden",
      conversionRate: "analytics.kpi.conversionUnavailable",
    },
  };
}

function computeSalesAnalytics(range, role) {
  if (!roleSections(role).has("sales")) return { forbidden: true };
  const orders = filterOrders(range);
  const trendMap = new Map();
  const countryMap = new Map();
  const productMap = new Map();
  const brandMap = new Map();

  for (const order of orders) {
    const day = berlinDateKey(order.createdAt);
    const bucket = trendMap.get(day) || { date: day, revenue: 0, orders: 0, units: 0 };
    bucket.revenue += order.total || 0;
    bucket.orders += 1;
    bucket.units += sum(order.lines || [], (l) => l.qty || 0);
    trendMap.set(day, bucket);

    const country = order.shippingAddress?.country || "DE";
    countryMap.set(country, (countryMap.get(country) || 0) + (order.total || 0));

    for (const line of order.lines || []) {
      productMap.set(line.productId, {
        productId: line.productId,
        name: line.name,
        revenue: (productMap.get(line.productId)?.revenue || 0) + estimateLineRevenue(line),
        units: (productMap.get(line.productId)?.units || 0) + (line.qty || 0),
      });
      const productsById = loadProducts();
      const product = productsById.get(line.productId);
      const brand = product?.brand || "Unknown";
      brandMap.set(brand, (brandMap.get(brand) || 0) + estimateLineRevenue(line));
    }
  }

  const trend = [...trendMap.values()].sort((a, b) => a.date.localeCompare(b.date));
  const topProducts = [...productMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  const topBrands = [...brandMap.entries()]
    .map(([brand, revenue]) => ({ brand, revenue: round2(revenue) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
  const salesByCountry = [...countryMap.entries()]
    .map(([country, revenue]) => ({ country, revenue: round2(revenue) }))
    .sort((a, b) => b.revenue - a.revenue);

  return {
    range,
    trend: trend.map((row) => ({ ...row, revenue: round2(row.revenue) })),
    topProducts,
    topBrands,
    salesByCountry,
    totals: {
      revenue: round2(sum(orders, (o) => o.total || 0)),
      orders: orders.length,
      unitsSold: sum(orders, (o) => sum(o.lines || [], (l) => l.qty || 0)),
      averageOrderValue: orders.length ? round2(sum(orders, (o) => o.total || 0) / orders.length) : 0,
    },
  };
}

function computeCategoryAnalytics(range, role, categoryId) {
  if (!roleSections(role).has("categories")) return { forbidden: true };
  const orders = filterOrders(range);
  const categoryIndex = loadCategoryIndex();
  const productsById = loadProducts();
  const totals = new Map();

  for (const order of orders) {
    for (const line of order.lines || []) {
      const product = productsById.get(line.productId);
      const catId = product?.category_id || "unknown";
      const mainId = mainCategoryId(catId, categoryIndex);
      if (categoryId && mainId !== categoryId && catId !== categoryId) continue;
      const key = categoryId || mainId;
      const entry = totals.get(key) || {
        categoryId: key,
        name: categoryIndex.get(key)?.name || key,
        revenue: 0,
        units: 0,
        orders: new Set(),
      };
      entry.revenue += estimateLineRevenue(line);
      entry.units += line.qty || 0;
      entry.orders.add(order.orderNumber);
      totals.set(key, entry);
    }
  }

  const rows = [...totals.values()]
    .map((row) => ({
      categoryId: row.categoryId,
      name: row.name,
      revenue: round2(row.revenue),
      units: row.units,
      orders: row.orders.size,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const children = categoryId
    ? rows
    : rows.slice(0, 20);

  return { range, categoryId: categoryId || null, categories: children };
}

function computeProductAnalytics(range, role) {
  if (!roleSections(role).has("products")) return { forbidden: true };
  const productsById = loadProducts();
  const orders = filterOrders(range);
  const salesMap = new Map();
  const returns = readJson(returnsFile, []);

  for (const order of orders) {
    for (const line of order.lines || []) {
      const current = salesMap.get(line.productId) || { productId: line.productId, units: 0, revenue: 0 };
      current.units += line.qty || 0;
      current.revenue += estimateLineRevenue(line);
      salesMap.set(line.productId, current);
    }
  }

  const returnCounts = new Map();
  for (const entry of returns) {
    for (const item of entry.items || []) {
      const key = item.productId || item.sku;
      returnCounts.set(key, (returnCounts.get(key) || 0) + (item.qty || 1));
    }
  }

  const activeProducts = [...productsById.values()].filter((p) => p.status === "active");
  const bestSellers = [...salesMap.values()]
    .map((row) => {
      const product = productsById.get(row.productId);
      return {
        productId: row.productId,
        name: product?.name || row.productId,
        sku: product?.sku,
        revenue: round2(row.revenue),
        units: row.units,
        stock: product?.stock,
        stockStatus: product?.stock_status,
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const slowMovers = activeProducts
    .filter((p) => !salesMap.has(p.id))
    .slice(0, 10)
    .map((p) => ({ productId: p.id, name: p.name, sku: p.sku, stock: p.stock, stockStatus: p.stock_status }));

  const lowStock = activeProducts
    .filter((p) => p.stock_status === "low_stock" || (p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD))
    .map((p) => ({ productId: p.id, name: p.name, sku: p.sku, stock: p.stock }));

  const outOfStock = activeProducts
    .filter((p) => p.stock_status === "out_of_stock" || p.stock <= 0)
    .map((p) => ({ productId: p.id, name: p.name, sku: p.sku, stock: p.stock }));

  const highReturns = bestSellers
    .map((row) => ({
      ...row,
      returns: returnCounts.get(row.productId) || returnCounts.get(row.sku) || 0,
    }))
    .filter((row) => row.returns > 0)
    .sort((a, b) => b.returns - a.returns)
    .slice(0, 10);

  return { range, bestSellers, slowMovers, lowStock, outOfStock, highReturns, lowStockThreshold: LOW_STOCK_THRESHOLD };
}

function computeCustomerAnalytics(range, role) {
  if (!roleSections(role).has("customers")) return { forbidden: true };
  const orders = filterOrders(range);
  const customers = loadCustomers();
  const emailsInRange = new Set(orders.map((o) => o.customer?.email).filter(Boolean));
  const allEmailsBefore = new Set(
    paidOrders(loadOrders())
      .filter((o) => berlinDateKey(o.createdAt) < range.start)
      .map((o) => o.customer?.email)
      .filter(Boolean)
  );

  let newCustomers = 0;
  let returningCustomers = 0;
  for (const email of emailsInRange) {
    if (allEmailsBefore.has(email)) returningCustomers += 1;
    else newCustomers += 1;
  }

  const countryMap = new Map();
  const valueMap = new Map();
  for (const order of orders) {
    const country = order.shippingAddress?.country || "DE";
    countryMap.set(country, (countryMap.get(country) || 0) + 1);
    const email = order.customer?.email;
    if (!email) continue;
    valueMap.set(email, (valueMap.get(email) || 0) + (order.total || 0));
  }

  const topCustomers = [...valueMap.entries()]
    .map(([email, total]) => ({ email: maskEmail(email), total: round2(total) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const accountTrend = new Map();
  for (const customer of customers) {
    if (!inRange(customer.createdAt, range)) continue;
    const day = berlinDateKey(customer.createdAt);
    accountTrend.set(day, (accountTrend.get(day) || 0) + 1);
  }

  return {
    range,
    newCustomers,
    returningCustomers,
    averageCustomerValue: emailsInRange.size
      ? round2(sum(orders, (o) => o.total || 0) / emailsInRange.size)
      : 0,
    geographicDistribution: [...countryMap.entries()].map(([country, ordersCount]) => ({ country, orders: ordersCount })),
    topCustomers,
    accountCreationTrend: [...accountTrend.entries()]
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

function maskEmail(email) {
  const [user, domain] = String(email).split("@");
  if (!domain) return "***";
  return `${user.slice(0, 2)}***@${domain}`;
}

function computeInventoryAnalytics(role) {
  if (!roleSections(role).has("inventory")) return { forbidden: true };
  const productsById = loadProducts();
  const activeProducts = [...productsById.values()].filter((p) => p.status === "active");
  const importLogs = readJson(path.join(dataDir, "import-logs.json"), []);
  const syncJobs = readJson(path.join(dataDir, "sync-logs.json"), []);

  return {
    totals: {
      activeProducts: activeProducts.length,
      inStock: activeProducts.filter((p) => p.stock_status === "in_stock").length,
      lowStock: activeProducts.filter((p) => p.stock_status === "low_stock" || (p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD)).length,
      outOfStock: activeProducts.filter((p) => p.stock_status === "out_of_stock" || p.stock <= 0).length,
    },
    lowStockThreshold: LOW_STOCK_THRESHOLD,
    syncErrors: importLogs.filter((l) => l.retry_status === "pending").length,
    recentSyncFailures: syncJobs.filter((j) => j.status === "failed").slice(-5),
  };
}

function computeSupplierAnalytics(range, role) {
  if (!roleSections(role).has("suppliers")) return { forbidden: true };
  const supplierOrders = readJson(supplierOrdersFile, []).filter((o) => inRange(o.createdAt, range));
  const fulfillments = readJson(fulfillmentsFile, []).filter((f) => inRange(f.createdAt, range));
  const bySupplier = new Map();

  for (const order of supplierOrders) {
    const bucket = bySupplier.get(order.supplierId) || {
      supplierId: order.supplierId,
      orders: 0,
      failed: 0,
      confirmed: 0,
    };
    bucket.orders += 1;
    if (order.status === "failed") bucket.failed += 1;
    if (order.status === "confirmed") bucket.confirmed += 1;
    bySupplier.set(order.supplierId, bucket);
  }

  const rows = [...bySupplier.values()].map((row) => ({
    ...row,
    successRate: row.orders ? round2((row.confirmed / row.orders) * 100) : 0,
    fulfillmentFailures: fulfillments.filter((f) => f.supplierId === row.supplierId && f.status === "failed").length,
  }));

  return { range, suppliers: rows.sort((a, b) => b.orders - a.orders) };
}

function computeFinanceAnalytics(range, role) {
  if (!canSeeFinance(role)) return { forbidden: true };
  const orders = filterOrders(range);
  const productsById = loadProducts();
  const grossSales = sum(orders, (o) => (o.subtotal || 0) + (o.shipping || 0));
  const discounts = sum(orders, (o) => o.discount || 0);
  const shippingRevenue = sum(orders, (o) => o.shipping || 0);
  const refunds = orders.filter((o) => o.status === "refunded");
  const refundTotal = sum(refunds, (o) => o.total || 0);
  const supplierCost = sum(orders, (o) => sum(o.lines || [], (l) => estimateLineCost(l, productsById)));
  const estimatedGrossProfit = grossSales - discounts - supplierCost;
  const estimatedShippingCost = round2(shippingRevenue * divisorEstimate(orders.length));

  return {
    range,
    grossSales: round2(grossSales),
    discounts: round2(discounts),
    refunds: round2(refundTotal),
    refundCount: refunds.length,
    shippingRevenue: round2(shippingRevenue),
    estimatedShippingCost,
    supplierCost: round2(supplierCost),
    estimatedGrossProfit: round2(estimatedGrossProfit),
    estimatedContributionMargin: round2(estimatedGrossProfit - estimatedShippingCost),
    disclaimer: "analytics.finance.disclaimer",
  };
}

function divisorEstimate(orderCount) {
  return orderCount > 0 ? 0.65 : 0;
}

function computeReturnsAnalytics(range, role) {
  if (!roleSections(role).has("returns")) return { forbidden: true };
  const returns = readJson(returnsFile, []).filter((r) => inRange(r.createdAt, range));
  const byStatus = new Map();
  for (const entry of returns) {
    byStatus.set(entry.status, (byStatus.get(entry.status) || 0) + 1);
  }
  return {
    range,
    total: returns.length,
    byStatus: [...byStatus.entries()].map(([status, count]) => ({ status, count })),
    recent: returns.slice(-10).reverse(),
  };
}

function toCsv(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(","));
  }
  return lines.join("\n");
}

function buildExport(section, range, role, format = "csv") {
  let payload;
  switch (section) {
    case "sales":
      payload = computeSalesAnalytics(range, role);
      break;
    case "products":
      payload = computeProductAnalytics(range, role);
      break;
    case "categories":
      payload = computeCategoryAnalytics(range, role);
      break;
    case "customers":
      payload = computeCustomerAnalytics(range, role);
      break;
    case "finance":
      payload = computeFinanceAnalytics(range, role);
      break;
    default:
      payload = computeOverview(range, role);
  }
  if (payload.forbidden) return { forbidden: true };
  if (format === "json") return { contentType: "application/json", body: JSON.stringify(payload, null, 2) };

  let rows = [];
  if (section === "sales" && payload.trend) rows = payload.trend;
  else if (section === "products" && payload.bestSellers) rows = payload.bestSellers;
  else if (section === "categories" && payload.categories) rows = payload.categories;
  else if (section === "customers" && payload.geographicDistribution) rows = payload.geographicDistribution;
  else if (section === "finance") rows = [payload];
  else rows = [payload.kpis || payload];

  return {
    contentType: "text/csv; charset=utf-8",
    body: toCsv(rows.map((row) => flattenRow(row))),
    filename: `buzzard-${section}-${range.start}-${range.end}.csv`,
  };
}

function flattenRow(row) {
  const out = {};
  for (const [key, value] of Object.entries(row || {})) {
    out[key] = typeof value === "object" ? JSON.stringify(value) : value;
  }
  return out;
}

module.exports = {
  resolveRange,
  roleSections,
  canSeeFinance,
  computeOverview,
  computeSalesAnalytics,
  computeCategoryAnalytics,
  computeProductAnalytics,
  computeCustomerAnalytics,
  computeInventoryAnalytics,
  computeSupplierAnalytics,
  computeFinanceAnalytics,
  computeReturnsAnalytics,
  buildExport,
};
