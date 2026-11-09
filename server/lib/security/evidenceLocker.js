/**
 * Digital evidence locker. Software append-only in a temp/work dir.
 * Not WORM. HMAC is MAC only, not a signature.
 */
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

function createLocker({ root = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-evidence-")) } = {}) {
  const originals = path.join(root, "originals");
  const working = path.join(root, "working");
  const custodyPath = path.join(root, "custody.jsonl");
  fs.mkdirSync(originals, { recursive: true });
  fs.mkdirSync(working, { recursive: true });
  const index = new Map();

  function appendCustody(event) {
    fs.appendFileSync(custodyPath, `${JSON.stringify({ ...event, at: new Date().toISOString() })}\n`);
  }

  function ingestOriginal({ bytes, source, method, acquiredBy = "esat_bey", confidence = "UNKNOWN" } = {}) {
    if (!Buffer.isBuffer(bytes) && typeof bytes !== "string") return { ok: false, code: "NO_BYTES" };
    const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(String(bytes), "utf8");
    const id = `ev_${crypto.randomBytes(6).toString("hex")}`;
    const sha256 = crypto.createHash("sha256").update(buf).digest("hex");
    const file = path.join(originals, `${id}.bin`);
    fs.writeFileSync(file, buf, { flag: "wx" });
    fs.chmodSync(file, 0o444);
    const rec = {
      evidence_id: id,
      class: "ORIGINAL",
      sha256,
      source: source || "unspecified",
      method: method || "copy",
      acquired_by: acquiredBy,
      acquired_at: new Date().toISOString(),
      read_only: true,
      parent_id: null,
      confidence,
      alt_explanations: ["NAT", "VPN", "false_positive", "shared_ip"],
      export_allowed: false,
      worm: false,
      hmacIsSignature: false,
    };
    index.set(id, rec);
    appendCustody({ event: "COLLECTED", evidence_id: id, actor: acquiredBy, sha256 });
    return { ok: true, record: rec, path: file, live: false };
  }

  function workingCopy(evidenceId, { actor = "sinan_bey" } = {}) {
    const rec = index.get(evidenceId);
    if (!rec || rec.class !== "ORIGINAL") return { ok: false, code: "ORIGINAL_REQUIRED" };
    const src = path.join(originals, `${evidenceId}.bin`);
    const copyId = `ev_${crypto.randomBytes(6).toString("hex")}`;
    const dest = path.join(working, `${copyId}.bin`);
    fs.copyFileSync(src, dest);
    const sha256 = crypto.createHash("sha256").update(fs.readFileSync(src)).digest("hex");
    if (sha256 !== rec.sha256) return { ok: false, code: "INTEGRITY_FAIL" };
    const copy = { ...rec, evidence_id: copyId, class: "WORKING_COPY", parent_id: evidenceId, read_only: false };
    index.set(copyId, copy);
    appendCustody({ event: "COPIED", evidence_id: copyId, parent_id: evidenceId, actor });
    return { ok: true, record: copy, path: dest };
  }

  function verify(evidenceId) {
    const rec = index.get(evidenceId);
    if (!rec) return { ok: false, code: "NOT_FOUND" };
    const dir = rec.class === "ORIGINAL" ? originals : working;
    const buf = fs.readFileSync(path.join(dir, `${evidenceId}.bin`));
    const sha256 = crypto.createHash("sha256").update(buf).digest("hex");
    return { ok: sha256 === rec.sha256, sha256, expected: rec.sha256, class: rec.class };
  }

  const accessLog = [];
  function access(evidenceId, { actor = "esat_bey", action = "READ_META" } = {}) {
    accessLog.push({ evidence_id: evidenceId, actor, action, at: new Date().toISOString() });
    appendCustody({ event: "ACCESS", evidence_id: evidenceId, actor, action });
    return { ok: true, logged: true };
  }

  function exportPack(evidenceId) {
    const rec = index.get(evidenceId);
    if (!rec) return { ok: false, code: "NOT_FOUND" };
    access(evidenceId, { actor: "human", action: "EXPORT_ATTEMPT" });
    if (!rec.export_allowed) return { ok: false, code: "HUMAN_EXPORT_APPROVED_REQUIRED", sent: false };
    return { ok: false, code: "EXPORT_NOT_SENT", sent: false, customerData: false };
  }

  function macNote() {
    return { algorithm: "none_in_this_locker", hmacIsSignature: false, worm: false };
  }

  return {
    ingestOriginal,
    workingCopy,
    verify,
    exportPack,
    access,
    accessLog: () => [...accessLog],
    macNote,
    get: (id) => index.get(id) || null,
    root,
    live: false,
  };
}

module.exports = { createLocker };
