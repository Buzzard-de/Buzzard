function sniff(buf) {
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { format: "png", bytes: buf.length };
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { format: "jpeg", bytes: buf.length };
  }
  return { format: "unknown", bytes: buf.length };
}

function validateImage(buffer) {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || []);
  if (!buf.length) return { ok: false, code: "EMPTY_IMAGE", understanding: false };
  const s = sniff(buf);
  if (s.format === "unknown") return { ok: false, code: "UNSUPPORTED_OR_CORRUPT_IMAGE", understanding: false, bytes: s.bytes };
  return { ok: true, ...s, understanding: false, ocr: false, detect: false };
}

module.exports = { validateImage };
