/**
 * Part 5 — Shared sync pipeline utilities.
 */
const { DATA_FORMAT } = require("../../core/jobConstants");

function validateSku(sku) {
  if (!sku || typeof sku !== "string") return { ok: false, error: "missing_sku" };
  if (sku.length > 128) return { ok: false, error: "sku_too_long" };
  if (/[<>]/.test(sku)) return { ok: false, error: "invalid_sku_chars" };
  return { ok: true };
}

function validatePrice(price) {
  const n = Number(price);
  if (!Number.isFinite(n) || n < 0) return { ok: false, error: "invalid_price" };
  return { ok: true, value: n };
}

function validateStock(stock) {
  const n = Number(stock);
  if (!Number.isInteger(n) || n < 0) return { ok: false, error: "invalid_stock" };
  return { ok: true, value: n };
}

function detectDuplicateSku(existingSkus, sku) {
  return existingSkus.has(sku);
}

function parseSourceFormat(format, raw) {
  switch (format) {
    case DATA_FORMAT.JSON:
      return typeof raw === "string" ? JSON.parse(raw) : raw;
    case DATA_FORMAT.XML:
      return { _format: "XML", _raw: String(raw).slice(0, 500) };
    case DATA_FORMAT.CSV:
      return { _format: "CSV", _rows: String(raw).split("\n").slice(0, 10) };
    case DATA_FORMAT.REST:
    default:
      return raw;
  }
}

module.exports = {
  validateSku,
  validatePrice,
  validateStock,
  detectDuplicateSku,
  parseSourceFormat,
};
