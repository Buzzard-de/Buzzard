const crypto = require("crypto");
const { db } = require("./db");
const { getDatabaseHealth } = require("./db");
const { getOrchestratorStatus } = require("./orchestratorBridge");
const { getGuardianStatus } = require("./guardianBridge");
const { listAudit } = require("./coreAudit");
const { listSecurityEvents } = require("./securityLog");
const categoryVisibility = require("./categoryVisibility");
const { aiCanExecute } = require("./rbac");
const {
  SERVICE_STATUS,
  AI_EMPLOYEE_STATUS,
  TASK_PRIORITY,
  TASK_STATUS,
  RISK_LEVEL,
  INTEGRATION_STATUS,
  DEFAULT_AI_EMPLOYEES,
  mapHealthToServiceStatus,
} = require("../core");

function newId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

function parseJson(val, fallback = {}) {
  if (!val) return fallback;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

function recordSystemEvent({ eventType, actorType, actorId, resourceType, resourceId, summary, metadata }) {
  const id = newId("evt");
  db.prepare(`
    INSERT INTO core_system_events(id, event_type, actor_type, actor_id, resource_type, resource_id, summary, metadata_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, eventType, actorType || null, actorId || null, resourceType || null, resourceId || null, summary || "", JSON.stringify(metadata || {}));
  return id;
}

function seedDefaults() {
  const count = db.prepare("SELECT COUNT(*) n FROM core_ai_employees").get().n;
  if (count === 0) {
    const insert = db.prepare(`
      INSERT INTO core_ai_employees(id, name, department, description, responsibility, permissions_json, status, priority, capabilities_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const emp of DEFAULT_AI_EMPLOYEES) {
      insert.run(
        emp.id,
        emp.name,
        emp.department,
        emp.description,
        emp.responsibility,
        JSON.stringify(emp.permissions),
        AI_EMPLOYEE_STATUS.ACTIVE,
        emp.priority,
        JSON.stringify(emp.capabilities)
      );
    }
  }

  const intCount = db.prepare("SELECT COUNT(*) n FROM core_integrations").get().n;
  if (intCount === 0) {
    const integrations = [
      { code: "buzzard-api", name: "Buzzard API", type: "internal", status: INTEGRATION_STATUS.CONNECTED },
      { code: "orchestrator", name: "AI Orchestrator", type: "ai", status: INTEGRATION_STATUS.DISCONNECTED },
      { code: "guardian", name: "AI Guardian", type: "ai", status: INTEGRATION_STATUS.DISCONNECTED },
      { code: "stripe", name: "Stripe", type: "payment", status: INTEGRATION_STATUS.DISABLED },
      { code: "paypal", name: "PayPal", type: "payment", status: INTEGRATION_STATUS.DISABLED },
      { code: "suppliers", name: "Supplier Hub", type: "supplier", status: INTEGRATION_STATUS.DISCONNECTED },
    ];
    const ins = db.prepare(`
      INSERT INTO core_integrations(id, code, name, type, status)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const row of integrations) {
      ins.run(newId("int"), row.code, row.name, row.type, row.status);
    }
  }
}

async function getSystemStatus() {
  const dbHealth = getDatabaseHealth();
  const orchestrator = await getOrchestratorStatus();
  const guardian = await getGuardianStatus();

  const runningJobs = db.prepare("SELECT COUNT(*) n FROM core_background_jobs WHERE status IN ('queued','running')").get().n;
  const failedJobs = db.prepare("SELECT COUNT(*) n FROM core_background_jobs WHERE status = 'failed'").get().n;

  return {
    generatedAt: new Date().toISOString(),
    services: {
      APPLICATION: { status: SERVICE_STATUS.ONLINE, detail: "Buzzard API running" },
      DATABASE: {
        status: mapHealthToServiceStatus(!dbHealth.error, Boolean(dbHealth.error)),
        detail: dbHealth.error || `${dbHealth.products ?? 0} products`,
      },
      AUTHENTICATION: { status: SERVICE_STATUS.ONLINE, detail: "Admin auth module loaded" },
      AI_ORCHESTRATOR: {
        status: orchestrator.reachable ? SERVICE_STATUS.ONLINE : orchestrator.configured ? SERVICE_STATUS.WARNING : SERVICE_STATUS.UNKNOWN,
        detail: orchestrator.orchestratorUrl || "not configured",
      },
      API: { status: SERVICE_STATUS.ONLINE, detail: "/api/health OK" },
      BACKGROUND_JOBS: {
        status: failedJobs > 0 ? SERVICE_STATUS.WARNING : SERVICE_STATUS.ONLINE,
        detail: `${runningJobs} running, ${failedJobs} failed`,
      },
      MONITORING: { status: SERVICE_STATUS.ONLINE, detail: "Hooks ready" },
      AI_GUARDIAN: {
        status: guardian.reachable ? SERVICE_STATUS.ONLINE : guardian.configured ? SERVICE_STATUS.WARNING : SERVICE_STATUS.UNKNOWN,
        detail: guardian.guardianUrl || "not configured",
      },
    },
  };
}

function mapEmployeeRow(row) {
  const assigned = db.prepare("SELECT COUNT(*) n FROM core_ai_tasks WHERE employee_id = ? AND status NOT IN ('COMPLETED','CANCELLED')").get(row.id).n;
  return {
    id: row.id,
    name: row.name,
    department: row.department,
    description: row.description,
    responsibility: row.responsibility,
    permissions: parseJson(row.permissions_json, []),
    status: row.status,
    priority: row.priority,
    capabilities: parseJson(row.capabilities_json, []),
    assignedTasks: assigned,
    lastActivity: row.last_activity_at,
    errors: row.error_message,
    performance: parseJson(row.performance_json, {}),
  };
}

function listAiEmployees() {
  seedDefaults();
  return db.prepare("SELECT * FROM core_ai_employees ORDER BY priority DESC, name ASC").all().map(mapEmployeeRow);
}

function getAiEmployee(id) {
  const row = db.prepare("SELECT * FROM core_ai_employees WHERE id = ?").get(id);
  return row ? mapEmployeeRow(row) : null;
}

function updateAiEmployeeStatus(id, status) {
  db.prepare(`
    UPDATE core_ai_employees SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(status, id);
  return getAiEmployee(id);
}

function mapTaskRow(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    employeeId: row.employee_id,
    priority: row.priority,
    status: row.status,
    permissionsRequired: parseJson(row.permissions_required_json, []),
    payload: parseJson(row.payload_json, {}),
    result: parseJson(row.result_json, null),
    error: row.error_message,
    retryCount: row.retry_count,
    maxRetries: row.max_retries,
    dependsOnTaskId: row.depends_on_task_id,
    createdBy: row.created_by,
    assignedAt: row.assigned_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const AI_BLOCKED_PERMISSIONS = new Set([
  "*",
  "system.configure",
  "security.manage",
  "users.write",
  "integrations.manage",
  "categories.publish",
]);

function assertAiPermissionsAllowed(permissionsRequired) {
  for (const perm of permissionsRequired || []) {
    if (AI_BLOCKED_PERMISSIONS.has(perm)) {
      const { logSecurityEvent } = require("./securityLog");
      logSecurityEvent({
        type: "ai_permission_violation",
        success: false,
        detail: { permission: perm, reason: "blocked_for_ai" },
      });
      throw new Error(`AI cannot request permission: ${perm}`);
    }
  }
}

function assertEmployeeCan(taskPermissions, employee) {
  if (!employee) throw new Error("Employee not found");
  if (employee.status !== AI_EMPLOYEE_STATUS.ACTIVE) throw new Error("Employee not active");
  for (const perm of taskPermissions || []) {
    if (!aiCanExecute(employee.permissions, perm)) {
      throw new Error(`Permission denied: ${perm}`);
    }
  }
}

function createAiTask({ title, description, employeeId, priority, permissionsRequired, payload, createdBy, dependsOnTaskId }) {
  seedDefaults();
  assertAiPermissionsAllowed(permissionsRequired);
  const id = newId("task");
  let status = TASK_STATUS.PENDING;
  let assignedAt = null;

  if (employeeId) {
    const employee = getAiEmployee(employeeId);
    assertEmployeeCan(permissionsRequired, employee);
    status = TASK_STATUS.ASSIGNED;
    assignedAt = new Date().toISOString();
  }

  db.prepare(`
    INSERT INTO core_ai_tasks(
      id, title, description, employee_id, priority, status,
      permissions_required_json, payload_json, created_by, depends_on_task_id, assigned_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    title,
    description || "",
    employeeId || null,
    priority || TASK_PRIORITY.NORMAL,
    status,
    JSON.stringify(permissionsRequired || []),
    JSON.stringify(payload || {}),
    createdBy || null,
    dependsOnTaskId || null,
    assignedAt
  );

  recordSystemEvent({
    eventType: "ai.task.created",
    actorType: "admin",
    actorId: createdBy,
    resourceType: "ai_task",
    resourceId: id,
    summary: `AI task created: ${title}`,
  });

  return mapTaskRow(db.prepare("SELECT * FROM core_ai_tasks WHERE id = ?").get(id));
}

function listAiTasks(filters = {}) {
  let sql = "SELECT * FROM core_ai_tasks WHERE 1=1";
  const params = [];
  if (filters.status) {
    sql += " AND status = ?";
    params.push(filters.status);
  }
  if (filters.employeeId) {
    sql += " AND employee_id = ?";
    params.push(filters.employeeId);
  }
  sql += " ORDER BY created_at DESC LIMIT ?";
  params.push(filters.limit || 100);
  return db.prepare(sql).all(...params).map(mapTaskRow);
}

function updateTaskStatus(id, status, { error, result, actorType } = {}) {
  const existing = db.prepare("SELECT * FROM core_ai_tasks WHERE id = ?").get(id);
  if (!existing) return null;

  if (
    actorType === "ai" &&
    existing.status === TASK_STATUS.WAITING_APPROVAL &&
    status !== TASK_STATUS.CANCELLED
  ) {
    throw new Error("Approval required before execution");
  }

  if (
    status === TASK_STATUS.COMPLETED &&
    existing.status === TASK_STATUS.WAITING_APPROVAL
  ) {
    const pending = db.prepare("SELECT status FROM core_approvals WHERE task_id = ? AND status = 'PENDING'").get(id);
    if (pending) throw new Error("Cannot complete task while approval is pending");
  }
  const fields = ["status = ?", "updated_at = CURRENT_TIMESTAMP"];
  const params = [status];
  if (status === TASK_STATUS.RUNNING) {
    fields.push("started_at = COALESCE(started_at, CURRENT_TIMESTAMP)");
  }
  if (status === TASK_STATUS.COMPLETED || status === TASK_STATUS.FAILED || status === TASK_STATUS.CANCELLED) {
    fields.push("completed_at = CURRENT_TIMESTAMP");
  }
  if (error !== undefined) {
    fields.push("error_message = ?");
    params.push(error);
  }
  if (result !== undefined) {
    fields.push("result_json = ?");
    params.push(JSON.stringify(result));
  }
  params.push(id);
  db.prepare(`UPDATE core_ai_tasks SET ${fields.join(", ")} WHERE id = ?`).run(...params);
  return mapTaskRow(db.prepare("SELECT * FROM core_ai_tasks WHERE id = ?").get(id));
}

function createApproval({ taskId, resourceType, resourceId, aiRecommendation, reason, riskLevel }) {
  const id = newId("appr");
  db.prepare(`
    INSERT INTO core_approvals(id, task_id, resource_type, resource_id, ai_recommendation, reason, risk_level, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')
  `).run(id, taskId || null, resourceType || null, resourceId || null, aiRecommendation || "", reason || "", riskLevel || RISK_LEVEL.MEDIUM);

  if (taskId) {
    updateTaskStatus(taskId, TASK_STATUS.WAITING_APPROVAL);
  }

  recordSystemEvent({
    eventType: "approval.created",
    resourceType: "approval",
    resourceId: id,
    summary: `Approval requested: ${reason || resourceType}`,
    metadata: { riskLevel: riskLevel || RISK_LEVEL.MEDIUM },
  });

  return getApproval(id);
}

function getApproval(id) {
  const row = db.prepare("SELECT * FROM core_approvals WHERE id = ?").get(id);
  if (!row) return null;
  return {
    id: row.id,
    taskId: row.task_id,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    aiRecommendation: row.ai_recommendation,
    reason: row.reason,
    riskLevel: row.risk_level,
    status: row.status,
    decidedBy: row.decided_by,
    decidedAt: row.decided_at,
    metadata: parseJson(row.metadata_json, {}),
    createdAt: row.created_at,
  };
}

function listApprovals(status) {
  let sql = "SELECT * FROM core_approvals";
  const params = [];
  if (status) {
    sql += " WHERE status = ?";
    params.push(status);
  }
  sql += " ORDER BY created_at DESC LIMIT 100";
  return db.prepare(sql).all(...params).map((row) => getApproval(row.id));
}

function decideApproval(id, decision, decidedBy) {
  const status = decision === "approve" ? "APPROVED" : "REJECTED";
  db.prepare(`
    UPDATE core_approvals SET status = ?, decided_by = ?, decided_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(status, decidedBy, id);

  const approval = getApproval(id);
  if (approval?.taskId) {
    updateTaskStatus(
      approval.taskId,
      decision === "approve" ? TASK_STATUS.ASSIGNED : TASK_STATUS.CANCELLED
    );
  }

  recordSystemEvent({
    eventType: `approval.${decision}`,
    actorType: "admin",
    actorId: decidedBy,
    resourceType: "approval",
    resourceId: id,
    summary: `Approval ${status.toLowerCase()}`,
  });

  return approval;
}

function createEscalation({ sourceType, sourceId, title, message, riskLevel, metadata }) {
  const id = newId("esc");
  db.prepare(`
    INSERT INTO core_escalations(id, source_type, source_id, title, message, risk_level, status, metadata_json)
    VALUES (?, ?, ?, ?, ?, ?, 'OPEN', ?)
  `).run(id, sourceType, sourceId || null, title, message || "", riskLevel || RISK_LEVEL.MEDIUM, JSON.stringify(metadata || {}));

  createNotification({
    eventType: "escalation.created",
    priority: riskLevel || RISK_LEVEL.MEDIUM,
    recipient: "administrators",
    payload: { escalationId: id, title },
  });

  return getEscalation(id);
}

function getEscalation(id) {
  const row = db.prepare("SELECT * FROM core_escalations WHERE id = ?").get(id);
  if (!row) return null;
  return {
    id: row.id,
    sourceType: row.source_type,
    sourceId: row.source_id,
    title: row.title,
    message: row.message,
    riskLevel: row.risk_level,
    status: row.status,
    assignedTo: row.assigned_to,
    resolvedAt: row.resolved_at,
    metadata: parseJson(row.metadata_json, {}),
    createdAt: row.created_at,
  };
}

function listEscalations(status) {
  let sql = "SELECT * FROM core_escalations";
  const params = [];
  if (status) {
    sql += " WHERE status = ?";
    params.push(status);
  }
  sql += " ORDER BY created_at DESC LIMIT 100";
  return db.prepare(sql).all(...params).map((row) => getEscalation(row.id));
}

function createNotification({ eventType, priority, recipient, channel, payload }) {
  const id = newId("ntf");
  db.prepare(`
    INSERT INTO core_notifications(id, event_type, priority, recipient, channel, status, payload_json)
    VALUES (?, ?, ?, ?, ?, 'PENDING', ?)
  `).run(id, eventType, priority || "NORMAL", recipient || "admin", channel || "internal", JSON.stringify(payload || {}));
  return { id, eventType, priority, recipient, channel, status: "PENDING", createdAt: new Date().toISOString() };
}

function listNotifications(limit = 50) {
  return db.prepare("SELECT * FROM core_notifications ORDER BY created_at DESC LIMIT ?").all(limit).map((row) => ({
    id: row.id,
    eventType: row.event_type,
    priority: row.priority,
    recipient: row.recipient,
    channel: row.channel,
    status: row.status,
    payload: parseJson(row.payload_json, {}),
    deliveryResult: row.delivery_result,
    createdAt: row.created_at,
    sentAt: row.sent_at,
  }));
}

function listIntegrations() {
  seedDefaults();
  return db.prepare("SELECT * FROM core_integrations ORDER BY name ASC").all().map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    type: row.type,
    status: row.status,
    healthUrl: row.health_url,
    lastCheckAt: row.last_check_at,
    lastError: row.last_error,
    config: parseJson(row.config_json, {}),
  }));
}

async function refreshIntegrationStatus() {
  const orchestrator = await getOrchestratorStatus();
  const guardian = await getGuardianStatus();

  db.prepare(`
    UPDATE core_integrations SET status = ?, last_check_at = CURRENT_TIMESTAMP, last_error = NULL
    WHERE code = 'orchestrator'
  `).run(orchestrator.reachable ? INTEGRATION_STATUS.CONNECTED : orchestrator.configured ? INTEGRATION_STATUS.ERROR : INTEGRATION_STATUS.DISCONNECTED);

  db.prepare(`
    UPDATE core_integrations SET status = ?, last_check_at = CURRENT_TIMESTAMP, last_error = NULL
    WHERE code = 'guardian'
  `).run(guardian.reachable ? INTEGRATION_STATUS.CONNECTED : guardian.configured ? INTEGRATION_STATUS.ERROR : INTEGRATION_STATUS.DISCONNECTED);

  return listIntegrations();
}

function listBackgroundJobs(limit = 50) {
  return db.prepare("SELECT * FROM core_background_jobs ORDER BY created_at DESC LIMIT ?").all(limit).map((row) => ({
    id: row.id,
    jobType: row.job_type,
    status: row.status,
    payload: parseJson(row.payload_json, {}),
    result: parseJson(row.result_json, null),
    error: row.error_message,
    retryCount: row.retry_count,
    nextRunAt: row.next_run_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  }));
}

function listActivity(limit = 50) {
  const events = db.prepare("SELECT * FROM core_system_events ORDER BY created_at DESC LIMIT ?").all(limit).map((row) => ({
    id: row.id,
    eventType: row.event_type,
    actorType: row.actor_type,
    actorId: row.actor_id,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    summary: row.summary,
    metadata: parseJson(row.metadata_json, {}),
    createdAt: row.created_at,
  }));
  return events;
}

function getSecurityCenterSummary() {
  const securityEvents = listSecurityEvents(50);
  const failedLogins = securityEvents.filter((e) => e.type?.includes("login") && !e.success);
  const audit = listAudit(30);
  return {
    failedLogins: failedLogins.length,
    recentSecurityEvents: securityEvents.slice(0, 20),
    criticalAuditEvents: audit.filter((a) =>
      ["security.", "approval.", "role.", "permission."].some((p) => String(a.action).startsWith(p))
    ).slice(0, 20),
  };
}

function getPublicConfig() {
  const rows = db.prepare("SELECT key, value, updated_at FROM core_config ORDER BY key ASC").all();
  const blocked = new Set(["password", "secret", "token", "api_key", "apikey", "jwt"]);
  return rows
    .filter((row) => !blocked.has(row.key.toLowerCase()) && !row.key.toLowerCase().includes("secret"))
    .map((row) => ({ key: row.key, value: row.value, updatedAt: row.updated_at }));
}

function setConfig(key, value, updatedBy) {
  if (/secret|password|token|api_key|apikey/i.test(key)) {
    throw new Error("Secret keys cannot be stored via config API");
  }
  db.prepare(`
    INSERT INTO core_config(key, value, updated_by, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = CURRENT_TIMESTAMP
  `).run(key, String(value), updatedBy || null);
  return { key, value };
}

function globalSearch(query) {
  const q = `%${String(query || "").trim()}%`;
  if (!q || q === "%%") return { products: [], categories: [], tasks: [], employees: [] };

  const products = db.prepare("SELECT sku, name FROM products WHERE name LIKE ? OR sku LIKE ? LIMIT 10").all(q, q);
  const tasks = db.prepare("SELECT id, title, status FROM core_ai_tasks WHERE title LIKE ? LIMIT 10").all(q);
  const employees = db.prepare("SELECT id, name, status FROM core_ai_employees WHERE name LIKE ? LIMIT 10").all(q);

  return {
    products,
    tasks,
    employees,
    query: query.trim(),
  };
}

function getDashboardSummary() {
  seedDefaults();
  categoryVisibility.syncFromDb(db);
  return {
    aiEmployees: listAiEmployees().length,
    activeTasks: db.prepare("SELECT COUNT(*) n FROM core_ai_tasks WHERE status NOT IN ('COMPLETED','CANCELLED')").get().n,
    pendingApprovals: db.prepare("SELECT COUNT(*) n FROM core_approvals WHERE status = 'PENDING'").get().n,
    openEscalations: db.prepare("SELECT COUNT(*) n FROM core_escalations WHERE status = 'OPEN'").get().n,
    categoriesManaged: Object.keys(categoryVisibility.listAllStatuses()).length,
  };
}

module.exports = {
  seedDefaults,
  getSystemStatus,
  listAiEmployees,
  getAiEmployee,
  updateAiEmployeeStatus,
  createAiTask,
  listAiTasks,
  updateTaskStatus,
  createApproval,
  listApprovals,
  decideApproval,
  createEscalation,
  listEscalations,
  createNotification,
  listNotifications,
  listIntegrations,
  refreshIntegrationStatus,
  listBackgroundJobs,
  listActivity,
  getSecurityCenterSummary,
  getPublicConfig,
  setConfig,
  globalSearch,
  getDashboardSummary,
  recordSystemEvent,
  categoryVisibility,
};
