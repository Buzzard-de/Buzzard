/**
 * Input and output rules for the back-office AI Center routes.
 *
 * Input: only the listed fields, with bounded types. Anything else is refused
 * before the AI Center library sees it (the library accepts a `deps` object
 * for its unit tests; a request must never be able to supply one).
 *
 * Output: every answer has to say that nothing was executed and no provider
 * was called. An answer that claims otherwise is not sent.
 */

const LANGUAGE = /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN = /^[A-Za-z][A-Za-z0-9_-]{0,39}$/;
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const FORBIDDEN_KEYS = new Set(["deps", "__proto__", "constructor", "prototype"]);
const MAX_OUTPUT_BYTES = 64 * 1024;

const check = {
  text: (max, { required = false } = {}) => (value) => {
    if (value === undefined || value === null || value === "") return required ? null : { value: undefined };
    if (typeof value !== "string" || value.length > max || CONTROL.test(value)) return null;
    return { value };
  },
  language: (value) => {
    if (value === undefined || value === null || value === "") return { value: undefined };
    return typeof value === "string" && LANGUAGE.test(value) ? { value } : null;
  },
  requiredLanguage: (value) => (typeof value === "string" && LANGUAGE.test(value) ? { value } : null),
  token: (value) => {
    if (value === undefined || value === null || value === "") return { value: undefined };
    return typeof value === "string" && TOKEN.test(value) ? { value } : null;
  },
  identifier: (value) => {
    if (value === undefined || value === null || value === "") return { value: undefined };
    if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return { value: String(value) };
    return typeof value === "string" && IDENTIFIER.test(value) ? { value } : null;
  },
  customerId: (value) => {
    if (value === undefined || value === null || value === "") return { value: undefined };
    const number = typeof value === "number" ? value : typeof value === "string" && /^\d{1,12}$/.test(value) ? Number(value) : NaN;
    return Number.isSafeInteger(number) && number > 0 ? { value: number } : null;
  },
  uuid: (value) => {
    if (value === undefined || value === null || value === "") return { value: undefined };
    return typeof value === "string" && UUID.test(value) ? { value } : null;
  },
  filters: (value) => {
    if (value === undefined || value === null) return { value: undefined };
    if (!Array.isArray(value) || value.length > 8) return null;
    for (const entry of value) {
      if (typeof entry !== "string" || entry.length === 0 || entry.length > 64 || CONTROL.test(entry)) return null;
    }
    return { value: value.slice() };
  },
  product: (value) => {
    if (typeof value === "string") return check.text(4000, { required: true })(value);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const out = {};
    for (const key of Object.keys(value)) {
      if (!["name", "description", "short_description"].includes(key)) return null;
      const field = check.text(4000)(value[key]);
      if (!field) return null;
      if (field.value !== undefined) out[key] = field.value;
    }
    return Object.keys(out).length ? { value: out } : null;
  },
};

const SCHEMAS = {
  session: { language: check.language, channel: check.token, customerId: check.customerId, customer_id: check.customerId },
  chat: {
    message: check.text(4000),
    language: check.language,
    channel: check.token,
    sessionToken: check.uuid,
    action: check.token,
    orderNumber: check.identifier,
    order_number: check.identifier,
    customerId: check.customerId,
    customer_id: check.customerId,
  },
  recommend: {
    query: check.text(1000),
    context: check.text(1000),
    action: check.token,
    productId: check.identifier,
    product_id: check.identifier,
  },
  productCopy: {
    product: check.product,
    productSku: check.identifier,
    product_sku: check.identifier,
    action: check.token,
  },
  translate: {
    text: check.text(4000, { required: true }),
    targetLanguage: check.requiredLanguage,
    entityType: check.token,
    entity_type: check.token,
    entityId: check.identifier,
    entity_id: check.identifier,
    action: check.token,
  },
  reviewSentiment: {
    review: check.text(4000, { required: true }),
    reviewId: check.identifier,
    review_id: check.identifier,
    action: check.token,
  },
  smartSearch: {
    query: check.text(500),
    filters: check.filters,
    action: check.token,
    productId: check.identifier,
    product_id: check.identifier,
  },
};

const REQUIRED = {
  productCopy: ["product"],
  translate: ["text", "targetLanguage"],
  reviewSentiment: ["review"],
};

/** Returns { value } with only the known, checked fields, or { error: <field> }. */
function validateInput(operation, body) {
  const schema = SCHEMAS[operation];
  if (!schema) return { error: "operation" };
  if (body === null || typeof body !== "object" || Array.isArray(body)) return { error: "body" };
  const value = {};
  for (const key of Object.keys(body)) {
    if (FORBIDDEN_KEYS.has(key) || !Object.prototype.hasOwnProperty.call(schema, key)) return { error: key.slice(0, 40) };
    const checked = schema[key](body[key]);
    if (!checked) return { error: key };
    if (checked.value !== undefined) value[key] = checked.value;
  }
  for (const key of REQUIRED[operation] || []) {
    if (value[key] === undefined) return { error: key };
  }
  return { value };
}

function validateJobId(raw) {
  return typeof raw === "string" && /^[1-9]\d{0,9}$/.test(raw) ? Number(raw) : null;
}

function validateSessionToken(raw) {
  return typeof raw === "string" && UUID.test(raw) ? raw : null;
}

const MUST_NOT_BE_TRUE = ["providerCalled", "executed", "orderStarted", "paymentStarted", "cancelStarted", "refundStarted", "purchaseStarted"];

/** { ok: true } when the result may be sent, otherwise { ok: false, reason }. */
function checkOutput(result) {
  if (!result || typeof result !== "object" || Array.isArray(result)) return { ok: false, reason: "not_an_object" };
  for (const flag of MUST_NOT_BE_TRUE) {
    if (result[flag] === true) return { ok: false, reason: flag };
  }
  if (result.dryRun === false) return { ok: false, reason: "dryRun" };
  if (result.job && typeof result.job === "object" && result.job.status === "completed") return { ok: false, reason: "job_completed" };
  let size;
  try {
    size = Buffer.byteLength(JSON.stringify(result));
  } catch {
    return { ok: false, reason: "not_serialisable" };
  }
  if (size > MAX_OUTPUT_BYTES) return { ok: false, reason: "too_large" };
  return { ok: true };
}

module.exports = { validateInput, validateJobId, validateSessionToken, checkOutput, SCHEMAS };
