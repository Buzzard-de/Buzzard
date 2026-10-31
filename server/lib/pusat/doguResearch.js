/**
 * Doğu Bey research desk — sourced findings only; otherwise UNVERIFIED.
 * Does not invent live web results. Records requested sources and dates.
 */
const crypto = require("crypto");
const { hasPermission, getMember } = require("./council");

const TOPICS = Object.freeze([
  "categories",
  "product_groups",
  "product_technologies",
  "markets",
  "competitors",
  "competitor_software",
  "logistics",
  "suppliers",
  "trade_law",
  "market_opportunity",
  "missing_buzzard_tech",
]);

function createDoguDesk({ now = () => new Date() } = {}) {
  const requests = [];
  const reports = [];
  const tasks = [];

  function requestResearch({ fromId, topic, question, categoryCode } = {}) {
    if (!hasPermission(fromId, "research.request") && fromId !== "pusat") {
      return { ok: false, code: "PERMISSION_DENIED" };
    }
    if (!TOPICS.includes(topic)) {
      return { ok: false, code: "UNKNOWN_TOPIC" };
    }
    const req = {
      id: `res_${crypto.randomBytes(6).toString("hex")}`,
      fromId,
      assignedTo: "dogu_bey",
      topic,
      question,
      categoryCode: categoryCode || getMember(fromId)?.categoryCode || null,
      status: "QUEUED",
      createdAt: now().toISOString(),
    };
    requests.push(req);
    return { ok: true, request: req };
  }

  function complete({ requestId, sources = [], findings, performedBy = "dogu_bey" } = {}) {
    const req = requests.find((r) => r.id === requestId);
    if (!req) return { ok: false, code: "NOT_FOUND" };
    const datedSources = (sources || []).filter((s) => s && s.url && s.retrievedAt);
    const verified = datedSources.length > 0;
    const report = {
      id: `rpt_${crypto.randomBytes(6).toString("hex")}`,
      requestId,
      toId: req.fromId,
      topic: req.topic,
      findings: findings || "",
      sources: datedSources,
      verification: verified ? "SOURCED" : "UNVERIFIED",
      performedBy,
      completedAt: now().toISOString(),
    };
    req.status = "COMPLETED";
    reports.push(report);
    return { ok: true, report };
  }

  function evaluateAndRoute({ reportId, evaluatorId, developmentTask } = {}) {
    const report = reports.find((r) => r.id === reportId);
    if (!report) return { ok: false, code: "NOT_FOUND" };
    if (report.toId !== evaluatorId && evaluatorId !== "pusat") {
      return { ok: false, code: "NOT_REQUESTER" };
    }
    if (!developmentTask) {
      return { ok: true, routed: false, report };
    }
    const task = {
      id: `dev_${crypto.randomBytes(6).toString("hex")}`,
      fromReport: reportId,
      routedBy: "pusat",
      title: developmentTask,
      status: "OPEN",
      createdAt: now().toISOString(),
    };
    tasks.push(task);
    return { ok: true, routed: true, task };
  }

  return {
    TOPICS,
    requestResearch,
    complete,
    evaluateAndRoute,
    listRequests: () => [...requests],
    listReports: () => [...reports],
    listTasks: () => [...tasks],
  };
}

module.exports = { createDoguDesk, TOPICS };
