const crypto = require("crypto");

function pngIhdr(buf) {
  if (buf.length < 24) return null;
  if (buf[0] !== 0x89 || buf[1] !== 0x50) return null;
  return {
    format: "png",
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
    bitDepth: buf[24],
    colorType: buf[25],
  };
}

function jpegSof(buf) {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    if (len < 2) break;
    if (marker === 0xc0 || marker === 0xc2) {
      return {
        format: "jpeg",
        bits: buf[i + 4],
        height: buf.readUInt16BE(i + 5),
        width: buf.readUInt16BE(i + 7),
      };
    }
    i += 2 + len;
  }
  return { format: "jpeg", width: null, height: null };
}

function stats(buffer) {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || []);
  if (!buf.length) return { ok: false, code: "EMPTY_IMAGE", understanding: false };
  const sha256 = crypto.createHash("sha256").update(buf).digest("hex");
  const png = pngIhdr(buf);
  const jpeg = png ? null : jpegSof(buf);
  const geo = png || jpeg;
  if (!geo) return { ok: false, code: "UNSUPPORTED_OR_CORRUPT_IMAGE", bytes: buf.length, understanding: false };
  return {
    ok: true,
    ...geo,
    bytes: buf.length,
    sha256,
    understanding: false,
    ocr: false,
    detect: false,
    note: "geometry_and_hash_not_scene_understanding",
  };
}

module.exports = { stats, pngIhdr };
