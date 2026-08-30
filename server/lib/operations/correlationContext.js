/**
 * Part 17 — Request / job correlation context (AsyncLocalStorage-free, explicit propagation).
 */
const crypto = require("crypto");

const store = new Map();

function newRequestId() {
  return `req_${crypto.randomBytes(8).toString("hex")}`;
}

function newCorrelationId() {
  return `corr_${crypto.randomBytes(8).toString("hex")}`;
}

function createContext({ requestId, correlationId, jobId, actor } = {}) {
  const ctx = {
    requestId: requestId || newRequestId(),
    correlationId: correlationId || newCorrelationId(),
    jobId: jobId || null,
    actor: actor || null,
    createdAt: new Date().toISOString(),
  };
  store.set(ctx.requestId, ctx);
  return ctx;
}

function getContext(requestId) {
  if (!requestId) return null;
  return store.get(requestId) || null;
}

function bindJob(requestId, jobId) {
  const ctx = store.get(requestId);
  if (ctx) ctx.jobId = jobId;
  return ctx;
}

function formatLogPrefix(ctx) {
  if (!ctx) return "";
  const parts = [`req=${ctx.requestId}`];
  if (ctx.correlationId) parts.push(`corr=${ctx.correlationId}`);
  if (ctx.jobId) parts.push(`job=${ctx.jobId}`);
  return parts.join(" ");
}

function middleware() {
  return (req, res, next) => {
    const incoming = req.headers["x-request-id"] || req.headers["x-correlation-id"];
    const ctx = createContext({
      requestId: req.headers["x-request-id"] || undefined,
      correlationId: incoming || undefined,
      actor: req.adminUser?.email || req.user?.email || null,
    });
    req.requestId = ctx.requestId;
    req.correlationId = ctx.correlationId;
    req.operationsContext = ctx;
    res.setHeader("X-Request-Id", ctx.requestId);
    res.setHeader("X-Correlation-Id", ctx.correlationId);
    next();
  };
}

module.exports = {
  newRequestId,
  newCorrelationId,
  createContext,
  getContext,
  bindJob,
  formatLogPrefix,
  middleware,
};
