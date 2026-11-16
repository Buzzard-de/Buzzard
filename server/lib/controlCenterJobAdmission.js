/**
 * Control-center job admission.
 * Uses the existing core_ai_tasks and core_approvals records.
 * A job row is created only after that approval is decided.
 */
const { JOB_TYPES, JOB_PRIORITY, DEFAULT_MAX_RETRIES } = require("../core/jobConstants");
const { can } = require("./rbac");

const CONTROL_CENTER_JOB_RESOURCE = "background_job";
const CONTROL_CENTER_JOB_ORIGIN = "control_center";
const CONTROL_CENTER_JOB_PERMISSION = "system.configure";

const JOB_SOURCES = Object.freeze({
  CONTROL_CENTER: "control_center",
  AUTOMATION: "automation",
  AUTOMATION_SYNC: "automation_sync",
  SCHEDULER: "scheduler",
  PIM_IMPORT: "pim_import",
  AI_BRIDGE: "ai_bridge",
});

const ADMITTED_SOURCES = new Set(Object.values(JOB_SOURCES));

const NON_RETRYABLE_JOB_CODES = new Set([
  "APPROVAL_REQUIRED",
  "APPROVAL_LOOKUP_FAILED",
  "APPROVAL_JOB_MISMATCH",
  "APPROVAL_SOURCE_MISMATCH",
  "APPROVAL_JOB_TYPE_MISMATCH",
  "APPROVAL_ALREADY_USED",
  "JOB_EXECUTION_REFUSED",
  "DRY_RUN_REQUIRED",
  "JOB_SOURCE_REJECTED",
]);

const ALLOWED_JOB_TYPES = new Set(Object.values(JOB_TYPES));
const ALLOWED_PRIORITIES = new Set(Object.values(JOB_PRIORITY));

const MAX_PAYLOAD_BYTES = 4096;
const MAX_DEPTH = 4;
const MAX_KEYS = 40;
const MAX_STRING = 500;
const MAX_ARRAY = 20;

const BLOCKED_KEYS = new Set([
  "charge",
  "capturepayment",
  "enablesales",
  "activatesales",
  "forcegolive",
  "apikey",
  "api_key",
  "token",
  "password",
  "secret",
  "authorization",
  "live",
  "submitorder",
  "origin",
  "approvalid",
  "taskid",
  "__proto__",
  "constructor",
  "prototype",
  "outboundurl",
  "fetchurl",
  "webhookurl",
  "destinationurl",
  "callbackurl",
  "apiurl",
]);

const HIGH_RISK_TYPES = new Set([
  JOB_TYPES.PRODUCT_SYNC,
  JOB_TYPES.PRICE_SYNC,
  JOB_TYPES.STOCK_SYNC,
  JOB_TYPES.SUPPLIER_SYNC,
  JOB_TYPES.CATALOG_SYNC,
  JOB_TYPES.PRODUCT_IMPORT,
  JOB_TYPES.PRODUCT_MAPPING,
  JOB_TYPES.AI_TASK,
  JOB_TYPES.NOTIFICATION,
]);

function refusal(status, code, message) {
  return { ok: false, status, code, message };
}

function roleCanConfigureJobs(role) {
  return can(role, CONTROL_CENTER_JOB_PERMISSION);
}

function enforceControlCenterJobAccess({ requireAuth, requirePermission, req, res, permission }) {
  const identity = requireAuth(req, res, { realm: "admin" });
  if (!identity) return false;
  return requirePermission(req, res, permission || CONTROL_CENTER_JOB_PERMISSION) === true;
}

function inspectPayload(value, depth, state) {
  if (value === null) return null;
  const type = typeof value;
  if (type === "string") {
    if (value.length > MAX_STRING) return "PAYLOAD_STRING_TOO_LONG";
    if (/https?:\/\//i.test(value)) return "EGRESS_URL_REFUSED";
    state.bytes += value.length;
    return null;
  }
  if (type === "number") {
    if (!Number.isFinite(value)) return "PAYLOAD_NUMBER_REFUSED";
    return null;
  }
  if (type === "boolean") return null;
  if (Array.isArray(value)) {
    if (depth >= MAX_DEPTH) return "PAYLOAD_TOO_DEEP";
    if (value.length > MAX_ARRAY) return "PAYLOAD_TOO_LARGE";
    for (const item of value) {
      const code = inspectPayload(item, depth + 1, state);
      if (code) return code;
    }
    return null;
  }
  if (type !== "object") return "PAYLOAD_TYPE_REFUSED";
  if (Object.getPrototypeOf(value) !== Object.prototype) return "PAYLOAD_TYPE_REFUSED";
  const keys = Object.keys(value);
  if (keys.length > MAX_KEYS) return "PAYLOAD_TOO_LARGE";
  if (depth >= MAX_DEPTH) return "PAYLOAD_TOO_DEEP";
  for (const key of keys) {
    if (BLOCKED_KEYS.has(String(key).toLowerCase())) return "PAYLOAD_FIELD_REFUSED";
    if (key === "dryRun" && value[key] !== true) return "DRY_RUN_REQUIRED";
    const code = inspectPayload(value[key], depth + 1, state);
    if (code) return code;
  }
  return null;
}

function validateControlCenterJobRequest(body) {
  const source = body && typeof body === "object" ? body : {};
  const jobType = source.jobType;
  if (typeof jobType !== "string" || jobType.length === 0) {
    return refusal(400, "JOB_TYPE_REQUIRED", "jobType is required");
  }
  if (!ALLOWED_JOB_TYPES.has(jobType)) {
    return refusal(400, "JOB_TYPE_REJECTED", "jobType is not an admitted control-center job");
  }

  let priority = JOB_PRIORITY.NORMAL;
  if (source.priority !== undefined) {
    if (typeof source.priority !== "string" || !ALLOWED_PRIORITIES.has(source.priority)) {
      return refusal(400, "PRIORITY_REJECTED", "priority is not an admitted value");
    }
    priority = source.priority;
  }

  let maxRetries = DEFAULT_MAX_RETRIES;
  if (source.maxRetries !== undefined) {
    if (!Number.isInteger(source.maxRetries) || source.maxRetries < 0 || source.maxRetries > DEFAULT_MAX_RETRIES) {
      return refusal(400, "RETRY_LIMIT_REJECTED", "maxRetries exceeds the control-center limit");
    }
    maxRetries = source.maxRetries;
  }

  if (source.payload === undefined) {
    return {
      ok: true,
      jobType,
      priority,
      maxRetries,
      payload: { dryRun: true },
    };
  }
  if (!source.payload || typeof source.payload !== "object" || Array.isArray(source.payload)) {
    return refusal(400, "PAYLOAD_TYPE_REFUSED", "payload must be an object");
  }
  const state = { bytes: 0 };
  const code = inspectPayload(source.payload, 0, state);
  if (code) {
    const status = code === "EGRESS_URL_REFUSED" ? 403 : 400;
    return refusal(status, code, "payload was refused");
  }
  if (state.bytes > MAX_PAYLOAD_BYTES) {
    return refusal(400, "PAYLOAD_TOO_LARGE", "payload is too large");
  }

  const payload = JSON.parse(JSON.stringify(source.payload));
  payload.dryRun = true;
  return { ok: true, jobType, priority, maxRetries, payload };
}

function riskForJobType(jobType) {
  return HIGH_RISK_TYPES.has(jobType) ? "HIGH" : "MEDIUM";
}

function admitBackgroundJob({ body, actor, source, deps, resourceId, scheduleId }) {
  if (!deps || typeof deps.createAiTask !== "function" || typeof deps.createApproval !== "function") {
    return refusal(500, "ADMISSION_DEPS_REQUIRED", "Admission dependencies are required");
  }
  if (typeof actor !== "string" || actor.length === 0) {
    return refusal(401, "ACTOR_REQUIRED", "An authenticated admin actor is required");
  }
  if (!ADMITTED_SOURCES.has(source)) {
    return refusal(400, "JOB_SOURCE_REJECTED", "The job source is not admitted");
  }

  const spec = validateControlCenterJobRequest(body);
  if (!spec.ok) return spec;

  if (typeof deps.assertJobPayloadEgress === "function") {
    const egress = deps.assertJobPayloadEgress(spec.payload);
    if (!egress || egress.ok === false) {
      return refusal(403, "EGRESS_DENIED", "payload egress was denied");
    }
  }
  if (typeof deps.assertJobSafe === "function") {
    const safety = deps.assertJobSafe({ jobType: spec.jobType, payload: spec.payload });
    if (!safety || safety.ok === false) {
      return refusal(403, "JOB_SAFETY_BLOCKED", "job safety gate refused this request");
    }
  }

  const task = deps.createAiTask({
    title: `${source} job ${spec.jobType}`,
    description: "Human approval is required before this job can be queued.",
    priority: spec.priority,
    permissionsRequired: [],
    payload: {
      kind: CONTROL_CENTER_JOB_RESOURCE,
      requiresApproval: true,
      jobType: spec.jobType,
      source,
    },
    createdBy: actor,
  });
  if (!task?.id) {
    return refusal(400, "TASK_ADMISSION_FAILED", "The approval task was not created");
  }

  const approval = deps.createApproval({
    taskId: task.id,
    resourceType: CONTROL_CENTER_JOB_RESOURCE,
    resourceId: resourceId || task.id,
    aiRecommendation: "Do not queue this job until a person approves it.",
    reason: `${source} ${spec.jobType} requested by ${actor}`,
    riskLevel: riskForJobType(spec.jobType),
    metadata: {
      origin: source,
      spec: {
        jobType: spec.jobType,
        priority: spec.priority,
        maxRetries: spec.maxRetries,
        payload: spec.payload,
        actor,
        source,
        scheduleId: scheduleId || null,
      },
    },
  });
  if (!approval?.id || approval.status !== "PENDING") {
    return refusal(400, "APPROVAL_ADMISSION_FAILED", "The human approval was not created");
  }

  return {
    ok: true,
    status: 202,
    pendingApproval: true,
    job: null,
    task,
    approval,
    spec: {
      jobType: spec.jobType,
      priority: spec.priority,
      maxRetries: spec.maxRetries,
      source,
    },
  };
}

function admitControlCenterJob(input) {
  return admitBackgroundJob({ ...input, source: CONTROL_CENTER_JOB_ORIGIN });
}

function planApprovalDecision(approval, decision) {
  if (
    decision === "approve"
    && approval?.resourceType === CONTROL_CENTER_JOB_RESOURCE
    && ADMITTED_SOURCES.has(approval?.metadata?.origin)
    && approval?.metadata?.spec?.source === approval.metadata.origin
    && approval?.metadata?.spec?.jobType
  ) {
    return { action: "release_background_job" };
  }
  if (decision === "approve" && approval?.taskId) {
    return { action: "resume_ai_task" };
  }
  return { action: "none" };
}

function releaseApprovedControlCenterJob({ approval, actor, deps }) {
  if (!deps || typeof deps.enqueueJob !== "function") {
    return refusal(500, "ADMISSION_DEPS_REQUIRED", "Release dependencies are required");
  }
  if (!approval || approval.resourceType !== CONTROL_CENTER_JOB_RESOURCE || !ADMITTED_SOURCES.has(approval.metadata?.origin)) {
    return refusal(409, "APPROVAL_REQUIRED", "This decision is not a background job approval");
  }
  if (approval.metadata?.spec?.source !== approval.metadata.origin) {
    return refusal(409, "APPROVAL_SOURCE_MISMATCH", "The approval source does not match the job source");
  }
  if (approval.status !== "APPROVED") {
    return refusal(409, "APPROVAL_REQUIRED", "The job stays unqueued until the approval is approved");
  }
  const metadata = approval.metadata || {};
  if (metadata.jobId) {
    return { ok: true, duplicate: true, job: { id: metadata.jobId } };
  }
  const stored = metadata.spec || {};
  const spec = validateControlCenterJobRequest({
    jobType: stored.jobType,
    priority: stored.priority,
    maxRetries: stored.maxRetries,
    payload: stored.payload,
  });
  if (!spec.ok) return spec;

  const job = deps.enqueueJob({
    jobType: spec.jobType,
    priority: spec.priority,
    maxRetries: spec.maxRetries,
    createdBy: actor || stored.actor || null,
    scheduleId: stored.scheduleId || null,
    payload: {
      ...spec.payload,
      dryRun: true,
      origin: metadata.origin,
      approvalId: approval.id,
    },
  });
  if (!job?.id) {
    return refusal(400, "JOB_RELEASE_FAILED", "The approved job was not queued");
  }
  if (typeof deps.rememberJob === "function") {
    deps.rememberJob({ approvalId: approval.id, jobId: job.id });
  }
  if (approval.taskId && typeof deps.updateTaskStatus === "function") {
    deps.updateTaskStatus(approval.taskId, "COMPLETED", {
      result: { jobId: job.id, queued: true, executed: false },
    });
  }
  return { ok: true, job };
}

function approvalMatchesJob(job, approval) {
  const payload = job?.payload || {};
  if (!approval || approval.status !== "APPROVED" || approval.resourceType !== CONTROL_CENTER_JOB_RESOURCE) {
    return { ok: false, code: "APPROVAL_REQUIRED" };
  }
  if (payload.approvalId !== approval.id) {
    return { ok: false, code: "APPROVAL_JOB_MISMATCH" };
  }
  if (!ADMITTED_SOURCES.has(approval.metadata?.origin) || approval.metadata.origin !== payload.origin) {
    return { ok: false, code: "APPROVAL_SOURCE_MISMATCH" };
  }
  if (approval.metadata?.spec?.source !== payload.origin) {
    return { ok: false, code: "APPROVAL_SOURCE_MISMATCH" };
  }
  if (!job?.jobType || approval.metadata?.spec?.jobType !== job.jobType) {
    return { ok: false, code: "APPROVAL_JOB_TYPE_MISMATCH" };
  }
  if (!approval.metadata?.jobId || approval.metadata.jobId !== job.id) {
    return { ok: false, code: "APPROVAL_JOB_MISMATCH" };
  }
  return { ok: true };
}

function assertApprovedForExecution(job, getApproval) {
  const payload = job?.payload || {};
  if (payload.dryRun !== true || payload.charge === true || payload.live === true || payload.enableSales === true || payload.activateSales === true) {
    return { ok: false, code: "JOB_EXECUTION_REFUSED" };
  }
  if (!ADMITTED_SOURCES.has(payload.origin)) {
    return { ok: false, code: "APPROVAL_REQUIRED" };
  }
  if (typeof payload.approvalId !== "string" || payload.approvalId.length === 0) {
    return { ok: false, code: "APPROVAL_REQUIRED" };
  }
  if (typeof getApproval !== "function") {
    return { ok: false, code: "APPROVAL_REQUIRED" };
  }
  let approval = null;
  try {
    approval = getApproval(payload.approvalId);
  } catch {
    return { ok: false, code: "APPROVAL_LOOKUP_FAILED" };
  }
  return approvalMatchesJob(job, approval);
}

function evaluateRunnableInsert({ jobType, payload, approval }) {
  const body = payload || {};
  if (body.dryRun !== true) {
    return refusal(403, "DRY_RUN_REQUIRED", "A runnable job requires dryRun true");
  }
  if (body.charge === true || body.live === true || body.enableSales === true || body.activateSales === true) {
    return refusal(403, "JOB_EXECUTION_REFUSED", "The job payload is refused");
  }
  if (!ADMITTED_SOURCES.has(body.origin) || typeof body.approvalId !== "string") {
    return refusal(409, "APPROVAL_REQUIRED", "A runnable job requires a bound approval");
  }
  if (!approval || approval.status !== "APPROVED" || approval.id !== body.approvalId || approval.resourceType !== CONTROL_CENTER_JOB_RESOURCE) {
    return refusal(409, "APPROVAL_REQUIRED", "The approval is not approved for this job");
  }
  if (approval.metadata?.origin !== body.origin || approval.metadata?.spec?.source !== body.origin) {
    return refusal(409, "APPROVAL_SOURCE_MISMATCH", "The approval source does not match the job source");
  }
  if (approval.metadata?.spec?.jobType !== jobType) {
    return refusal(409, "APPROVAL_JOB_TYPE_MISMATCH", "The approval job type does not match");
  }
  if (approval.metadata?.jobId) {
    return refusal(409, "APPROVAL_ALREADY_USED", "This approval already released a job");
  }
  return { ok: true };
}

function preHandlerDecision(job, getApproval, assertEgress) {
  const approvalGate = assertApprovedForExecution(job, getApproval);
  if (!approvalGate.ok) return approvalGate;
  const egress = typeof assertEgress === "function" ? assertEgress(job.payload || {}) : { ok: true };
  if (!egress || egress.ok === false) {
    return { ok: false, code: "JOB_EGRESS_DENIED", egressCode: egress?.code };
  }
  return { ok: true };
}

const PERIPHERAL_AUTOMATION_SOURCES = Object.freeze({
  PRICE_STOCK: "price_stock",
  ORDER_AUTOMATION: "order_automation",
  AI_CENTER: "ai_center",
  PIM_IMPORT: "pim_import",
  NOTIFICATION: "notification",
});

const PERIPHERAL_SOURCE_SET = new Set(Object.values(PERIPHERAL_AUTOMATION_SOURCES));

function workerExplicitlyEnabled(env = process.env) {
  return env.BUZZARD_WORKER_ENABLED === "1";
}

function admitPeripheralAutomation({ source, jobType, actor, subjectId, deps }) {
  if (!deps || typeof deps.createApproval !== "function" || typeof deps.newId !== "function") {
    return refusal(500, "ADMISSION_DEPS_REQUIRED", "Peripheral admission dependencies are required");
  }
  if (!PERIPHERAL_SOURCE_SET.has(source)) {
    return refusal(400, "JOB_SOURCE_REJECTED", "The automation source is not admitted");
  }
  if (typeof jobType !== "string" || jobType.length === 0) {
    return refusal(400, "JOB_TYPE_REQUIRED", "jobType is required");
  }
  if (typeof actor !== "string" || actor.length === 0) {
    return refusal(401, "ACTOR_REQUIRED", "An authenticated actor is required");
  }
  const jobId = deps.newId();
  const approval = deps.createApproval({
    taskId: null,
    resourceType: source,
    resourceId: jobId,
    aiRecommendation: "Do not run this automation until a person approves it.",
    reason: `${source} ${jobType} requested by ${actor}`,
    riskLevel: "HIGH",
    metadata: {
      origin: source,
      jobId,
      consumed: false,
      spec: {
        source,
        jobType,
        actor,
        subjectId: subjectId || null,
        dryRun: true,
      },
    },
  });
  if (!approval?.id || approval.status !== "PENDING") {
    return refusal(400, "APPROVAL_ADMISSION_FAILED", "The human approval was not created");
  }
  return {
    ok: true,
    status: 202,
    pendingApproval: true,
    executed: false,
    dryRun: true,
    job: null,
    jobId,
    approval,
  };
}

function assertPeripheralExecution({ source, jobType, jobId, approval }) {
  if (!approval || approval.status !== "APPROVED" || approval.resourceType !== source) {
    return { ok: false, code: "APPROVAL_REQUIRED" };
  }
  if (approval.metadata?.origin !== source || approval.metadata?.spec?.source !== source) {
    return { ok: false, code: "APPROVAL_SOURCE_MISMATCH" };
  }
  if (!jobType || approval.metadata?.spec?.jobType !== jobType) {
    return { ok: false, code: "APPROVAL_JOB_TYPE_MISMATCH" };
  }
  if (!jobId || approval.metadata?.jobId !== jobId) {
    return { ok: false, code: "APPROVAL_JOB_MISMATCH" };
  }
  if (approval.metadata?.spec?.dryRun !== true) {
    return { ok: false, code: "JOB_EXECUTION_REFUSED" };
  }
  if (approval.metadata?.consumed === true) {
    return { ok: false, code: "APPROVAL_ALREADY_USED" };
  }
  return { ok: true, dryRun: true };
}

function assertPipelineStart({ coreJob, approval, getApproval } = {}) {
  if (coreJob) return assertApprovedForExecution(coreJob, getApproval);
  if (approval) {
    return assertPeripheralExecution({
      source: PERIPHERAL_AUTOMATION_SOURCES.PIM_IMPORT,
      jobType: "PRODUCT_IMPORT",
      jobId: approval.metadata?.jobId,
      approval,
    });
  }
  return { ok: false, code: "APPROVAL_REQUIRED" };
}

function peripheralDeps() {
  const crypto = require("crypto");
  const controlCenter = require("./controlCenter");
  const { db } = require("./db");
  return {
    newId: () => `auto_${crypto.randomBytes(8).toString("hex")}`,
    createApproval: (input) => controlCenter.createApproval(input, { trustMetadata: true }),
    getApproval: (id) => controlCenter.getApproval(id),
    consumeApproval(approvalId) {
      const row = db.prepare("SELECT metadata_json FROM core_approvals WHERE id = ?").get(approvalId);
      const meta = row?.metadata_json ? JSON.parse(row.metadata_json) : {};
      meta.consumed = true;
      const updated = db.prepare(`
        UPDATE core_approvals
        SET metadata_json = ?
        WHERE id = ? AND IFNULL(json_extract(metadata_json, '$.consumed'), 0) != 1
      `).run(JSON.stringify(meta), approvalId);
      return updated.changes === 1;
    },
  };
}

function productionDeps() {
  const controlCenter = require("./controlCenter");
  const jobSafetyGate = require("./jobSafetyGate");
  const { assertJobPayloadEgress } = require("./jobEgressGate");
  const { enqueueJob } = require("./jobQueue");
  const { db } = require("./db");
  return {
    assertJobSafe: (job) => jobSafetyGate.assertJobSafe(job),
    assertJobPayloadEgress,
    createAiTask: (input) => controlCenter.createAiTask(input),
    createApproval: (input) => controlCenter.createApproval(input, { trustMetadata: true }),
    updateTaskStatus: (id, status, extra) => controlCenter.updateTaskStatus(id, status, extra),
    enqueueJob,
    rememberJob({ approvalId, jobId }) {
      const row = db.prepare("SELECT metadata_json FROM core_approvals WHERE id = ?").get(approvalId);
      const meta = row?.metadata_json ? JSON.parse(row.metadata_json) : {};
      meta.jobId = jobId;
      db.prepare("UPDATE core_approvals SET metadata_json = ? WHERE id = ?").run(JSON.stringify(meta), approvalId);
    },
  };
}

module.exports = {
  CONTROL_CENTER_JOB_RESOURCE,
  CONTROL_CENTER_JOB_ORIGIN,
  CONTROL_CENTER_JOB_PERMISSION,
  JOB_SOURCES,
  ADMITTED_SOURCES,
  NON_RETRYABLE_JOB_CODES,
  roleCanConfigureJobs,
  enforceControlCenterJobAccess,
  validateControlCenterJobRequest,
  admitBackgroundJob,
  admitControlCenterJob,
  planApprovalDecision,
  releaseApprovedControlCenterJob,
  assertApprovedForExecution,
  evaluateRunnableInsert,
  preHandlerDecision,
  PERIPHERAL_AUTOMATION_SOURCES,
  workerExplicitlyEnabled,
  admitPeripheralAutomation,
  assertPeripheralExecution,
  assertPipelineStart,
  peripheralDeps,
  productionDeps,
};
