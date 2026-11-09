const { check } = require("../permissionEngine");

function report({ actorId = "sales_analysis_ai", rows = [] } = {}) {
  if (!check(actorId, "SALES_READ").ok) return { ok: false, code: "PERMISSION_DENIED" };
  const units = rows.reduce((s, r) => s + Number(r.units || 0), 0);
  const revenue = rows.reduce((s, r) => s + Number(r.revenue || 0), 0);
  const returns = rows.reduce((s, r) => s + Number(r.returns || 0), 0);
  const net = rows.reduce((s, r) => s + Number(r.net || 0), 0);
  return {
    ok: true,
    readOnly: true,
    units,
    revenue,
    returns,
    net,
    returnRate: units ? returns / units : 0,
    liveBi: false,
    write: false,
  };
}

function transfer() {
  return { ok: false, code: "HUMAN_GATE_REQUIRED", action: "BANK_TRANSFER" };
}

function changePrice() {
  return { ok: false, code: "HUMAN_GATE_REQUIRED", action: "PRICE_PUBLISH_LIVE" };
}

function deleteFinance() {
  return { ok: false, code: "HUMAN_GATE_REQUIRED", action: "DATA_DELETE" };
}

module.exports = { report, transfer, changePrice, deleteFinance };
