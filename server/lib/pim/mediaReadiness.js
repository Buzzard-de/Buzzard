/**
 * Product media readiness. No CDN upload, no live fetch.
 */
const { classifyProductOrigin } = require("./productOrigin");

const PLACEHOLDER = /(placeholder|lorem|example\.com|via\.placeholder|1x1|spacer|dummy|fake[-_]?image)/i;

function assessMedia({ url, altText, product } = {}) {
  const origin = classifyProductOrigin(product || {});
  const value = String(url || "").trim();
  if (!value) {
    return { ok: false, code: "MEDIA_URL_MISSING", liveUpload: false };
  }
  if (!/^https:\/\//i.test(value)) {
    return { ok: false, code: "MEDIA_HTTPS_REQUIRED", liveUpload: false };
  }
  if (PLACEHOLDER.test(value)) {
    return { ok: false, code: "MEDIA_PLACEHOLDER", liveUpload: false };
  }
  if (origin.demo || origin.origin === "DEMO") {
    return { ok: false, code: "MEDIA_DEMO_BLOCKED", liveUpload: false, origin: origin.origin };
  }
  const alt = String(altText || "").trim();
  return {
    ok: true,
    code: "MEDIA_READY_FOR_REVIEW",
    url: value,
    hasAlt: alt.length >= 3,
    liveUpload: false,
    cdnWrite: false,
    origin: origin.origin,
  };
}

function assessGallery(urls = [], product) {
  const items = (Array.isArray(urls) ? urls : []).map((url) => assessMedia({ url, product }));
  const ready = items.filter((row) => row.ok);
  return {
    ok: ready.length > 0,
    total: items.length,
    ready: ready.length,
    liveUpload: false,
    items,
  };
}

module.exports = { assessMedia, assessGallery };
