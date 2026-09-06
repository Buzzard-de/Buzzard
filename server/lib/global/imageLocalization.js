/**
 * Image localization validation.
 */
const FORBIDDEN_HOSTS = Object.freeze(["example.com", "placeholder.invalid", "demo.local"]);

function validateImageUrl(url) {
  const errors = [];
  if (!url) {
    errors.push({ code: "MISSING_IMAGE", field: "primaryImage", status: "REVIEW_REQUIRED" });
    return { valid: false, errors };
  }

  let parsed;
  try {
    parsed = new URL(String(url));
  } catch {
    errors.push({ code: "INVALID_IMAGE_URL", field: "primaryImage" });
    return { valid: false, errors };
  }

  if (parsed.protocol !== "https:") errors.push({ code: "IMAGE_NOT_HTTPS", field: "primaryImage" });
  if (FORBIDDEN_HOSTS.some((host) => parsed.hostname.includes(host))) {
    errors.push({ code: "FORBIDDEN_IMAGE_HOST", field: "primaryImage" });
  }
  if (/placeholder|demo/i.test(parsed.pathname)) {
    errors.push({ code: "DEMO_PLACEHOLDER_IMAGE", field: "primaryImage", status: "REVIEW_REQUIRED" });
  }

  return { valid: errors.length === 0, errors };
}

function validateLocalizedAltText(product = {}, language = "de") {
  const alt = product.imageAlt?.[language] || product.imagesAlt?.[language];
  if (!alt) {
    return { valid: false, status: "REVIEW_REQUIRED", code: "MISSING_LOCALIZED_ALT" };
  }
  return { valid: true, status: "VALID", alt };
}

module.exports = {
  validateImageUrl,
  validateLocalizedAltText,
  FORBIDDEN_HOSTS,
};
