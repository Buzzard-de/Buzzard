const { createEngine, notImplemented } = require("../engineContract");
const { validateImage } = require("../vision/imageValidate");
const { stats } = require("../vision/imageStats");
const { renderTextPng, ocrBitmap } = require("../vision/bitmapFont");
const { detectBlobs, syntheticTwoBlobs } = require("../vision/blobDetect");

function sniff(buffer) {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || []);
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { format: "png", bytes: buf.length };
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { format: "jpeg", bytes: buf.length };
  }
  return { format: "unknown", bytes: buf.length };
}

function createVisionEngine() {
  return createEngine({
    id: "vision",
    capabilities: ["sniff", "preprocess_noop"],
    executeImpl(input) {
      const op = input.op || "sniff";
      if (op === "sniff") return { op, ...sniff(input.bytes), understanding: false };
      if (op === "validate") return { op, ...validateImage(input.bytes) };
      if (op === "stats") return { op, ...stats(input.bytes) };
      if (op === "bitmap_ocr") {
        const src = input.bytes ? ocrBitmap(Buffer.from(input.bytes)) : ocrBitmap(renderTextPng(input.text || "SINAN").png);
        return { op, ...src };
      }
      if (op === "blobs") return { op, ...(input.gray ? detectBlobs(input.gray, input.width, input.height) : syntheticTwoBlobs()) };
      if (op === "understand" || op === "ocr" || op === "detect") {
        return { ...notImplemented(op), liveVision: false, general: false };
      }
      return notImplemented(op);
    },
  });
}

module.exports = { createVisionEngine, sniff };
