/**
 * QR customer identity + second-purchase campaign.
 * Reuses pricing, order identity, returns and customer access.
 * Does not send messages, print cards, or publish live campaigns.
 */

const crypto = require("crypto");
const pricing = require("./pricing");
const orderIdentity = require("./orderIdentity");
const customerAccess = require("./customerAccess");
const { LOYALTY_STATE, QR_ATTRIBUTION } = require("./constants");
const { PAYMENT_STATE: SECURE_PAYMENT } = require("./secureCommerceConstants");
const { MIN_NET_PROFIT_EUR } = require("../pusat/constants");

const CAMPAIGN_CODE = "QR_SECOND_PURCHASE";
const MAX_DISCOUNT_PERCENT = 15;
const RESERVE_TTL_MS = 15 * 60 * 1000;
const SCAN_BURST_LIMIT = 20;
const ALLOWED_REDIRECTS = Object.freeze([
  "/kampanya/qr",
  "/kampanya/qr/",
  "/konto/login",
  "/konto/login/",
  "/konto/loyalty",
  "/konto/loyalty/",
  "/",
]);

const MARKETPLACE_INSERT_POLICY = Object.freeze({
  [QR_ATTRIBUTION.AMAZON]: "REVIEW_REQUIRED",
  [QR_ATTRIBUTION.EBAY]: "REVIEW_REQUIRED",
  [QR_ATTRIBUTION.KAUFLAND]: "REVIEW_REQUIRED",
  [QR_ATTRIBUTION.ALLEGRO]: "REVIEW_REQUIRED",
  [QR_ATTRIBUTION.OTHER_MARKETPLACE]: "REVIEW_REQUIRED",
  [QR_ATTRIBUTION.BUZZARD_DIRECT]: "ALLOWED_LOCAL",
  [QR_ATTRIBUTION.ORGANIC]: "ALLOWED_LOCAL",
  [QR_ATTRIBUTION.UNKNOWN]: "REVIEW_REQUIRED",
});

function newId(prefix) {
  return `${prefix}_${crypto.randomBytes(10).toString("hex")}`;
}

function hashVisitor(input = {}) {
  const raw = `${input.userAgent || ""}|${input.ip || ""}|${input.visitorId || crypto.randomBytes(4).toString("hex")}`;
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

function writeEvent(db, row) {
  db.prepare(
    `INSERT INTO software_loyalty_events(
      id, entitlement_id, customer_id, event_type, from_state, to_state, canonical_order_id, details_json
    ) VALUES(?,?,?,?,?,?,?,?)`
  ).run(
    newId("slev"),
    row.entitlementId || null,
    row.customerId || null,
    row.eventType,
    row.fromState || null,
    row.toState || null,
    row.canonicalOrderId || null,
    JSON.stringify(row.details || {})
  );
}

function safeRedirect(path) {
  const raw = String(path || "/kampanya/qr/").trim();
  let pathname = raw;
  try {
    if (/^https?:\/\//i.test(raw)) {
      return { ok: false, reason: "OPEN_REDIRECT_BLOCKED", path: null };
    }
    pathname = raw.startsWith("/") ? raw.split("?")[0] : `/${raw.split("?")[0]}`;
  } catch {
    return { ok: false, reason: "OPEN_REDIRECT_BLOCKED", path: null };
  }
  const allowed = ALLOWED_REDIRECTS.includes(pathname);
  return {
    ok: allowed,
    reason: allowed ? null : "REDIRECT_NOT_ALLOWLISTED",
    path: allowed ? pathname : null,
  };
}

function issueCustomerQr(db, { customerId } = {}) {
  if (!customerId) return { ok: false, reason: "CUSTOMER_REQUIRED" };
  const existing = db
    .prepare("SELECT * FROM software_customer_qr WHERE customer_id = ? AND status = 'ACTIVE'")
    .get(customerId);
  if (existing) {
    return publicCustomerQr(existing, { duplicate: true });
  }
  const token = `bzqr_${crypto.randomBytes(16).toString("hex")}`;
  const id = newId("cqr");
  db.prepare("INSERT INTO software_customer_qr(id, customer_id, token, status) VALUES(?,?,?,'ACTIVE')").run(
    id,
    customerId,
    token
  );
  return publicCustomerQr({ id, customer_id: customerId, token, status: "ACTIVE" }, { duplicate: false });
}

function publicCustomerQr(row, extra = {}) {
  const dest = `/kampanya/qr/?c=${row.token}`;
  return {
    ok: true,
    qrKind: "customer",
    token: row.token,
    status: row.status,
    authenticates: false,
    piiIncluded: false,
    payload: { v: 1, t: "c", id: row.token },
    redirect: dest,
    ...extra,
    note: "QR scan does not sign the customer in and does not grant a discount.",
  };
}

function revokeCustomerQr(db, { customerId, token } = {}) {
  const row = token
    ? db.prepare("SELECT * FROM software_customer_qr WHERE token = ?").get(token)
    : db.prepare("SELECT * FROM software_customer_qr WHERE customer_id = ? AND status = 'ACTIVE'").get(customerId);
  if (!row) return { ok: false, reason: "QR_NOT_FOUND" };
  if (customerId && row.customer_id !== customerId) {
    return { ok: false, reason: "ACCESS_DENIED" };
  }
  db.prepare("UPDATE software_customer_qr SET status = 'REVOKED', revoked_at = CURRENT_TIMESTAMP WHERE id = ?").run(
    row.id
  );
  return { ok: true, revoked: true, token: row.token };
}

function issuePackageQr(db, input = {}) {
  const bound = orderIdentity.ensureBound(db, {
    refs: [
      orderIdentity.refFromValue(input.orderRef || input.canonicalOrderId),
      input.marketplaceRef
        ? { kind: orderIdentity.ORDER_ALIAS_KIND.MARKETPLACE_REF, value: input.marketplaceRef }
        : null,
      input.supplierRef ? { kind: orderIdentity.ORDER_ALIAS_KIND.SUPPLIER_REF, value: input.supplierRef } : null,
    ].filter(Boolean),
  });
  if (!bound.ok) return bound;
  const source = QR_ATTRIBUTION[input.attributionSource] || QR_ATTRIBUTION.UNKNOWN;
  const policy = MARKETPLACE_INSERT_POLICY[source] || "REVIEW_REQUIRED";
  const token = `bzpk_${crypto.randomBytes(16).toString("hex")}`;
  const id = newId("pqr");
  db.prepare(
    `INSERT INTO software_package_qr(
      id, token, canonical_order_id, package_ref, campaign_id, channel, attribution_source, eligibility_status, details_json
    ) VALUES(?,?,?,?,?,?,?,?,?)`
  ).run(
    id,
    token,
    bound.canonicalId,
    input.packageRef || null,
    input.campaignId || CAMPAIGN_CODE,
    input.channel || null,
    source,
    policy,
    JSON.stringify({
      livePublished: false,
      printed: false,
      piiIncluded: false,
      marketplacePolicyVerified: false,
    })
  );
  return {
    ok: true,
    qrKind: "package",
    token,
    canonicalOrderId: bound.canonicalId,
    packageRef: input.packageRef || null,
    campaignId: input.campaignId || CAMPAIGN_CODE,
    attributionSource: source,
    eligibilityStatus: policy,
    payload: { v: 1, t: "p", id: token },
    piiIncluded: false,
    financialIncluded: false,
    published: false,
    printed: false,
  };
}

function recordScan(db, input = {}) {
  const token = String(input.token || "").trim();
  if (!token) return { ok: false, reason: "TOKEN_REQUIRED" };
  const customerQr = db.prepare("SELECT * FROM software_customer_qr WHERE token = ?").get(token);
  const packageQr = db.prepare("SELECT * FROM software_package_qr WHERE token = ?").get(token);
  if (!customerQr && !packageQr) return { ok: false, reason: "QR_UNKNOWN" };
  if (customerQr && customerQr.status === "REVOKED") return { ok: false, reason: "QR_REVOKED" };

  const recent = db
    .prepare(
      `SELECT COUNT(*) AS n FROM software_qr_scans
       WHERE token = ? AND created_at >= datetime('now', '-1 minute')`
    )
    .get(token).n;
  const botSuspect = recent >= SCAN_BURST_LIMIT;
  const id = newId("qrs");
  db.prepare(
    `INSERT INTO software_qr_scans(
      id, qr_kind, token, visitor_hash, customer_id, marketing_consent, bot_suspect, review_required, details_json
    ) VALUES(?,?,?,?,?,?,?,?,?)`
  ).run(
    id,
    customerQr ? "customer" : "package",
    token,
    input.marketingConsent ? hashVisitor(input) : hashVisitor({ visitorId: "anon" }),
    input.authenticatedCustomerId || null,
    input.marketingConsent ? 1 : 0,
    botSuspect ? 1 : 0,
    botSuspect ? 1 : 0,
    JSON.stringify({
      grantsDiscount: false,
      authenticates: false,
      essentialProcessing: true,
      marketing: Boolean(input.marketingConsent),
    })
  );
  return {
    ok: true,
    scanId: id,
    grantsDiscount: false,
    authenticates: false,
    botSuspect,
    reviewRequired: botSuspect,
    landing: "/kampanya/qr/",
  };
}

function landingPublic(db, token) {
  const scanShape = {
    campaignActive: false,
    liveCampaign: false,
    maxDiscountPercent: MAX_DISCOUNT_PERCENT,
    minNetProfitEur: MIN_NET_PROFIT_EUR,
    scanDoesNotAuthenticate: true,
    scanDoesNotGrantDiscount: true,
    statutoryRightsUnchanged: true,
  };
  if (!token) return { ok: true, ...scanShape, known: false };
  const customerQr = db.prepare("SELECT token, status FROM software_customer_qr WHERE token = ?").get(token);
  const packageQr = db
    .prepare("SELECT token, eligibility_status, attribution_source FROM software_package_qr WHERE token = ?")
    .get(token);
  return {
    ok: true,
    ...scanShape,
    known: Boolean(customerQr || packageQr),
    qrKind: customerQr ? "customer" : packageQr ? "package" : null,
    packagePolicy: packageQr?.eligibility_status || null,
    attributionSource: packageQr?.attribution_source || null,
    customerId: null,
    email: null,
  };
}

function revealAccount(db, { token, requesterCustomerId }) {
  const access = customerAccess.assertOwnOrder({
    orderCustomerId: requesterCustomerId,
    requesterCustomerId,
  });
  if (!requesterCustomerId) return { ok: false, reason: "CUSTOMER_REQUIRED", denied: true };
  const row = db.prepare("SELECT * FROM software_customer_qr WHERE token = ?").get(token);
  if (!row) return { ok: false, reason: "QR_NOT_FOUND", denied: true };
  if (row.customer_id !== requesterCustomerId) {
    return { ok: false, reason: "ACCESS_DENIED", denied: true };
  }
  if (!access.ok && row.customer_id !== requesterCustomerId) {
    return { ok: false, reason: "ACCESS_DENIED", denied: true };
  }
  return { ok: true, customerId: row.customer_id, token: row.token, status: row.status };
}

function firstOrderDisqualifier(input = {}) {
  if (input.cancelled === true || input.orderCancelled === true) return "FIRST_ORDER_CANCELLED";
  if (input.returnCompleted === true || input.returned === true) return "FIRST_ORDER_RETURNED";
  if (input.returnPending === true || input.unresolvedReturn === true || input.unresolvedCancel === true) {
    return "PENDING_RETURN_OR_CANCEL";
  }
  const state = input.paymentState || input.payment?.state;
  const captured = input.captured === true || input.payment?.captured === true || state === SECURE_PAYMENT.PAYMENT_CAPTURED;
  if (!captured || (state && state !== SECURE_PAYMENT.PAYMENT_CAPTURED && state !== "PAYMENT_CAPTURED")) {
    if (state && state !== SECURE_PAYMENT.PAYMENT_CAPTURED) return "PAYMENT_NOT_CAPTURED";
    if (!captured) return "PAYMENT_NOT_CAPTURED";
  }
  return null;
}

function getEntitlement(db, customerId, campaignCode = CAMPAIGN_CODE) {
  return db
    .prepare("SELECT * FROM software_loyalty_entitlements WHERE customer_id = ? AND campaign_code = ?")
    .get(customerId, campaignCode);
}

function evaluateDiscount(costInput = {}, requestedPercent = MAX_DISCOUNT_PERCENT) {
  const requested = Math.min(MAX_DISCOUNT_PERCENT, Math.max(0, Number(requestedPercent) || 0));
  if (!costInput || costInput.supplierCost == null) {
    return { ok: false, failClosed: true, reason: "MISSING_ESSENTIAL_COST_DATA", invented: false };
  }
  const list = pricing.quote(costInput);
  if (!list.ok || !list.salePrice) return { ...list, saleApproved: false };
  const offered = Number(costInput.listPrice);
  const listPrice = Number.isFinite(offered) && offered > 0 ? offered : list.salePrice;
  let applied = requested;
  let preview = pricing.evaluateGivenSale(costInput, listPrice * (1 - applied / 100));
  while (applied > 0 && (!preview.ok || preview.saleApproved !== true)) {
    applied = Math.round((applied - 0.5) * 10) / 10;
    preview = pricing.evaluateGivenSale(costInput, listPrice * (1 - applied / 100));
  }
  if (!preview.ok || preview.saleApproved !== true || applied <= 0) {
    return {
      ok: false,
      failClosed: true,
      reason: "PROFIT_GATE",
      requestedPercent: requested,
      appliedPercent: 0,
      maxDiscountPercent: MAX_DISCOUNT_PERCENT,
      minNetProfitEur: MIN_NET_PROFIT_EUR,
      coversEveryOrderExpense: false,
      invented: false,
    };
  }
  return {
    ok: true,
    requestedPercent: requested,
    appliedPercent: applied,
    listPrice,
    discountedPrice: preview.salePrice,
    netProfit: preview.netProfit,
    saleApproved: true,
    stacking: false,
    maxDiscountPercent: MAX_DISCOUNT_PERCENT,
    minNetProfitEur: MIN_NET_PROFIT_EUR,
    coversEveryOrderExpense: false,
    transparent: true,
    invented: false,
  };
}

function evaluateEligibility(db, input = {}) {
  const customerId = input.customerId;
  if (!customerId) return { ok: false, reason: "CUSTOMER_REQUIRED", state: LOYALTY_STATE.NOT_ELIGIBLE };
  if (input.qrScanOnly === true) {
    return { ok: false, reason: "QR_SCAN_NOT_AUTHORITY", state: LOYALTY_STATE.NOT_ELIGIBLE, grantsDiscount: false };
  }
  if (input.clientSuccess === true) {
    return { ok: false, reason: "CLIENT_STATUS_NOT_AUTHORITATIVE", state: LOYALTY_STATE.NOT_ELIGIBLE };
  }
  if (input.otherDiscountApplied === true) {
    return { ok: false, reason: "STACKING_FORBIDDEN", state: LOYALTY_STATE.NOT_ELIGIBLE };
  }

  expireReservations(db, customerId);

  const existing = getEntitlement(db, customerId);
  if (existing?.state === LOYALTY_STATE.REDEEMED) {
    return { ok: false, reason: "ALREADY_REDEEMED", state: LOYALTY_STATE.REDEEMED, entitlementId: existing.id };
  }
  if (
    existing &&
    (existing.state === LOYALTY_STATE.ELIGIBLE || existing.state === LOYALTY_STATE.RESERVED) &&
    input.cancelled !== true &&
    input.returned !== true &&
    input.unresolvedReturn !== true &&
    !input.orderRef
  ) {
    return { ok: true, state: existing.state, entitlementId: existing.id, grantsDiscount: false };
  }

  if (!input.orderRef && !existing?.canonical_first_order_id) {
    upsertEntitlement(db, {
      customerId,
      state: LOYALTY_STATE.PENDING_FIRST_ORDER,
      firstOrderId: null,
    });
    return { ok: true, state: LOYALTY_STATE.PENDING_FIRST_ORDER, grantsDiscount: false };
  }

  const bound = input.orderRef
    ? orderIdentity.ensureBound(db, { refs: [orderIdentity.refFromValue(input.orderRef)] })
    : { ok: true, canonicalId: existing.canonical_first_order_id };
  if (!bound.ok) return { ...bound, state: LOYALTY_STATE.NOT_ELIGIBLE };

  const disqualifier = firstOrderDisqualifier(input);
  if (disqualifier === "PENDING_RETURN_OR_CANCEL") {
    const row = upsertEntitlement(db, {
      customerId,
      state: LOYALTY_STATE.PENDING_RETURN_WINDOW,
      firstOrderId: bound.canonicalId,
    });
    return { ok: true, state: LOYALTY_STATE.PENDING_RETURN_WINDOW, reason: disqualifier, entitlementId: row.id };
  }
  if (disqualifier) {
    const row = upsertEntitlement(db, {
      customerId,
      state: LOYALTY_STATE.NOT_ELIGIBLE,
      firstOrderId: bound.canonicalId,
      details: { disqualifier },
    });
    return { ok: false, state: LOYALTY_STATE.NOT_ELIGIBLE, reason: disqualifier, entitlementId: row.id };
  }

  const discount = evaluateDiscount(input.costInput || {}, input.requestedPercent);
  if (!discount.ok) {
    const row = upsertEntitlement(db, {
      customerId,
      state: LOYALTY_STATE.NOT_ELIGIBLE,
      firstOrderId: bound.canonicalId,
      details: { discount },
    });
    return { ok: false, ...discount, state: LOYALTY_STATE.NOT_ELIGIBLE, entitlementId: row.id };
  }

  const row = upsertEntitlement(db, {
    customerId,
    state: existing?.state === LOYALTY_STATE.RESERVED ? LOYALTY_STATE.RESERVED : LOYALTY_STATE.ELIGIBLE,
    firstOrderId: bound.canonicalId,
    discountPercent: discount.appliedPercent,
    details: { discount },
  });
  return {
    ok: true,
    state: row.state,
    entitlementId: row.id,
    canonicalFirstOrderId: bound.canonicalId,
    discount,
    grantsDiscount: false,
    statutoryReturnRights: "unchanged",
  };
}

function upsertEntitlement(db, input) {
  const current = getEntitlement(db, input.customerId);
  const nextState = input.state;
  if (!current) {
    const id = newId("slent");
    db.prepare(
      `INSERT INTO software_loyalty_entitlements(
        id, customer_id, campaign_code, canonical_first_order_id, state, discount_percent, details_json
      ) VALUES(?,?,?,?,?,?,?)`
    ).run(
      id,
      input.customerId,
      CAMPAIGN_CODE,
      input.firstOrderId || null,
      nextState,
      input.discountPercent || 0,
      JSON.stringify(input.details || {})
    );
    writeEvent(db, {
      entitlementId: id,
      customerId: input.customerId,
      eventType: "created",
      toState: nextState,
      canonicalOrderId: input.firstOrderId,
      details: input.details,
    });
    return getEntitlement(db, input.customerId);
  }
  if (current.state === LOYALTY_STATE.REDEEMED && nextState !== LOYALTY_STATE.REDEEMED) {
    return current;
  }
  db.prepare(
    `UPDATE software_loyalty_entitlements
     SET state = ?, canonical_first_order_id = COALESCE(?, canonical_first_order_id),
         discount_percent = COALESCE(?, discount_percent), details_json = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(
    nextState,
    input.firstOrderId || null,
    input.discountPercent == null ? current.discount_percent : input.discountPercent,
    JSON.stringify(input.details || {}),
    current.id
  );
  if (current.state !== nextState) {
    writeEvent(db, {
      entitlementId: current.id,
      customerId: input.customerId,
      eventType: "transition",
      fromState: current.state,
      toState: nextState,
      canonicalOrderId: input.firstOrderId || current.canonical_first_order_id,
      details: input.details,
    });
  }
  return getEntitlement(db, input.customerId);
}

function reserve(db, input = {}) {
  const customerId = input.customerId;
  const checkoutId = String(input.checkoutId || "").trim();
  if (!customerId || !checkoutId) return { ok: false, reason: "CHECKOUT_REQUIRED" };
  if (input.qrScanOnly === true) return { ok: false, reason: "QR_SCAN_NOT_AUTHORITY" };

  expireReservations(db, customerId);
  if (input.idempotencyKey) {
    const prior = db
      .prepare("SELECT * FROM software_loyalty_entitlements WHERE idempotency_key = ?")
      .get(input.idempotencyKey);
    if (prior) return { ok: true, duplicate: true, state: prior.state, entitlementId: prior.id };
  }

  const current = getEntitlement(db, customerId);
  if (!current || (current.state !== LOYALTY_STATE.ELIGIBLE && current.state !== LOYALTY_STATE.RESERVED)) {
    const eligibility = evaluateEligibility(db, input);
    if (eligibility.state !== LOYALTY_STATE.ELIGIBLE && eligibility.state !== LOYALTY_STATE.RESERVED) {
      return eligibility;
    }
  }
  const until = new Date(Date.now() + RESERVE_TTL_MS).toISOString();
  const updated = db
    .prepare(
      `UPDATE software_loyalty_entitlements
       SET state = ?, reserved_checkout_id = ?, reserved_until = ?, idempotency_key = COALESCE(idempotency_key, ?),
           updated_at = CURRENT_TIMESTAMP
       WHERE customer_id = ? AND campaign_code = ? AND state IN (?, ?)`
    )
    .run(
      LOYALTY_STATE.RESERVED,
      checkoutId,
      until,
      input.idempotencyKey || null,
      customerId,
      CAMPAIGN_CODE,
      LOYALTY_STATE.ELIGIBLE,
      LOYALTY_STATE.RESERVED
    );
  if (!updated.changes) {
    return { ok: false, reason: "RESERVE_CONFLICT", state: getEntitlement(db, customerId)?.state };
  }
  const row = getEntitlement(db, customerId);
  writeEvent(db, {
    entitlementId: row.id,
    customerId,
    eventType: "reserved",
    fromState: LOYALTY_STATE.ELIGIBLE,
    toState: LOYALTY_STATE.RESERVED,
    details: { checkoutId, idempotent: Boolean(input.idempotencyKey) },
  });
  return { ok: true, state: row.state, entitlementId: row.id, reservedUntil: row.reserved_until, duplicate: false };
}

function releaseReservation(db, { customerId, checkoutId, failedCheckout = true } = {}) {
  const row = getEntitlement(db, customerId);
  if (!row) return { ok: false, reason: "ENTITLEMENT_NOT_FOUND" };
  if (row.state !== LOYALTY_STATE.RESERVED) return { ok: true, state: row.state, released: false };
  if (checkoutId && row.reserved_checkout_id && row.reserved_checkout_id !== checkoutId) {
    return { ok: false, reason: "CHECKOUT_MISMATCH" };
  }
  db.prepare(
    `UPDATE software_loyalty_entitlements
     SET state = ?, reserved_checkout_id = NULL, reserved_until = NULL, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(LOYALTY_STATE.ELIGIBLE, row.id);
  writeEvent(db, {
    entitlementId: row.id,
    customerId,
    eventType: failedCheckout ? "checkout_failed" : "reservation_released",
    fromState: LOYALTY_STATE.RESERVED,
    toState: LOYALTY_STATE.ELIGIBLE,
  });
  return { ok: true, released: true, state: LOYALTY_STATE.ELIGIBLE, entitlementPreserved: true };
}

function expireReservations(db, customerId = null) {
  const now = new Date().toISOString();
  const rows = customerId
    ? db
        .prepare(
          `SELECT * FROM software_loyalty_entitlements
           WHERE customer_id = ? AND state = ? AND reserved_until IS NOT NULL AND reserved_until < ?`
        )
        .all(customerId, LOYALTY_STATE.RESERVED, now)
    : db
        .prepare(
          `SELECT * FROM software_loyalty_entitlements
           WHERE state = ? AND reserved_until IS NOT NULL AND reserved_until < ?`
        )
        .all(LOYALTY_STATE.RESERVED, now);
  for (const row of rows) {
    db.prepare(
      `UPDATE software_loyalty_entitlements
       SET state = ?, reserved_checkout_id = NULL, reserved_until = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(LOYALTY_STATE.ELIGIBLE, row.id);
    writeEvent(db, {
      entitlementId: row.id,
      customerId: row.customer_id,
      eventType: "reservation_expired",
      fromState: LOYALTY_STATE.RESERVED,
      toState: LOYALTY_STATE.ELIGIBLE,
    });
  }
  return { expired: rows.length };
}

function redeem(db, input = {}) {
  const customerId = input.customerId;
  const secondRef = input.secondOrderRef;
  if (!customerId || !secondRef) return { ok: false, reason: "REDEEM_INPUT_REQUIRED" };
  expireReservations(db, customerId);
  const row = getEntitlement(db, customerId);
  if (!row || (row.state !== LOYALTY_STATE.RESERVED && row.state !== LOYALTY_STATE.ELIGIBLE)) {
    return { ok: false, reason: "NOT_RESERVED", state: row?.state || LOYALTY_STATE.NOT_ELIGIBLE };
  }
  if (input.otherDiscountApplied === true) return { ok: false, reason: "STACKING_FORBIDDEN" };
  const second = orderIdentity.ensureBound(db, { refs: [orderIdentity.refFromValue(secondRef)] });
  if (!second.ok) return second;
  if (row.canonical_first_order_id) {
    const same = orderIdentity.assertSameOrder(db, row.canonical_first_order_id, second.canonicalId);
    if (same.ok) return { ok: false, reason: "FIRST_ORDER_REUSED" };
  }
  const discount = evaluateDiscount(input.costInput || {}, row.discount_percent || MAX_DISCOUNT_PERCENT);
  if (!discount.ok || discount.saleApproved !== true) {
    return { ok: false, reason: discount.reason || "PROFIT_GATE", discount };
  }
  const updated = db
    .prepare(
      `UPDATE software_loyalty_entitlements
       SET state = ?, canonical_redeem_order_id = ?, discount_percent = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND state IN (?, ?)`
    )
    .run(
      LOYALTY_STATE.REDEEMED,
      second.canonicalId,
      discount.appliedPercent,
      row.id,
      LOYALTY_STATE.RESERVED,
      LOYALTY_STATE.ELIGIBLE
    );
  if (!updated.changes) return { ok: false, reason: "REDEEM_CONFLICT" };
  writeEvent(db, {
    entitlementId: row.id,
    customerId,
    eventType: "redeemed",
    fromState: row.state,
    toState: LOYALTY_STATE.REDEEMED,
    canonicalOrderId: second.canonicalId,
    details: { discount, liveRedeemed: false },
  });
  return {
    ok: true,
    state: LOYALTY_STATE.REDEEMED,
    entitlementId: row.id,
    canonicalSecondOrderId: second.canonicalId,
    discount,
    liveOrderCreated: false,
  };
}

function reevaluateForOrder(db, input = {}) {
  const resolved = orderIdentity.resolve(db, input.orderRef);
  if (!resolved.ok) return { ok: false, reason: resolved.reason, mutatedOtherOrder: false };
  const rows = db
    .prepare("SELECT * FROM software_loyalty_entitlements WHERE canonical_first_order_id = ?")
    .all(resolved.canonicalId);
  const results = [];
  for (const row of rows) {
    if (input.eventOrderRef) {
      const same = orderIdentity.assertSameOrder(db, row.canonical_first_order_id, input.eventOrderRef);
      if (!same.ok) {
        results.push({ entitlementId: row.id, ok: false, reason: "ORDER_IDENTITY_MISMATCH" });
        continue;
      }
    }
    if (row.state === LOYALTY_STATE.REDEEMED) {
      writeEvent(db, {
        entitlementId: row.id,
        customerId: row.customer_id,
        eventType: "late_return_review",
        fromState: row.state,
        toState: row.state,
        canonicalOrderId: resolved.canonicalId,
        details: { reviewRequired: true, automaticClawback: false, statutoryRights: "unchanged" },
      });
      results.push({
        entitlementId: row.id,
        state: LOYALTY_STATE.REDEEMED,
        reviewRequired: true,
        automaticClawback: false,
      });
      continue;
    }
    const next =
      input.cancelled || input.returned
        ? LOYALTY_STATE.REVOKED
        : input.unresolvedReturn || input.unresolvedCancel
          ? LOYALTY_STATE.PENDING_RETURN_WINDOW
          : row.state;
    db.prepare("UPDATE software_loyalty_entitlements SET state = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(
      next,
      row.id
    );
    writeEvent(db, {
      entitlementId: row.id,
      customerId: row.customer_id,
      eventType: "reevaluated",
      fromState: row.state,
      toState: next,
      canonicalOrderId: resolved.canonicalId,
      details: { cancelled: Boolean(input.cancelled), returned: Boolean(input.returned) },
    });
    results.push({ entitlementId: row.id, state: next });
  }
  return { ok: true, canonicalId: resolved.canonicalId, results, mutatedOtherOrder: false };
}

function analytics(db) {
  const count = (sql, params = []) => Number(db.prepare(sql).get(...params).n || 0);
  const scans = count("SELECT COUNT(*) n FROM software_qr_scans");
  const repeatScans = count(
    `SELECT COUNT(*) n FROM (
       SELECT token FROM software_qr_scans GROUP BY token HAVING COUNT(*) > 1
     )`
  );
  const entitlements = count("SELECT COUNT(*) n FROM software_loyalty_entitlements");
  const redeemed = count("SELECT COUNT(*) n FROM software_loyalty_entitlements WHERE state = ?", [LOYALTY_STATE.REDEEMED]);
  const cancelledOrReturned = count(
    "SELECT COUNT(*) n FROM software_loyalty_entitlements WHERE state IN (?, ?)",
    [LOYALTY_STATE.REVOKED, LOYALTY_STATE.NOT_ELIGIBLE]
  );
  return {
    qrScans: scans,
    repeatScans,
    uniqueVisitors: count("SELECT COUNT(DISTINCT visitor_hash) n FROM software_qr_scans"),
    registeredCustomers: count("SELECT COUNT(DISTINCT customer_id) n FROM software_customer_qr"),
    eligibleEntitlements: count("SELECT COUNT(*) n FROM software_loyalty_entitlements WHERE state = ?", [
      LOYALTY_STATE.ELIGIBLE,
    ]),
    redeemedDiscounts: redeemed,
    completedOrders: null,
    returnedOrCancelled: cancelledOrReturned,
    qrToVisitConversion: scans ? Number((count("SELECT COUNT(DISTINCT token) n FROM software_qr_scans") / scans).toFixed(4)) : 0,
    qrToOrderConversion: null,
    secondPurchaseRate: entitlements ? Number((redeemed / entitlements).toFixed(4)) : 0,
    repeatPurchaseRate: null,
    cancellationReturnRate: entitlements ? Number((cancelledOrReturned / entitlements).toFixed(4)) : 0,
    entitlementRate: null,
    discountRedemptionRate: entitlements ? Number((redeemed / entitlements).toFixed(4)) : 0,
    channelAcquisition: db
      .prepare("SELECT attribution_source AS channel, COUNT(*) AS n FROM software_package_qr GROUP BY attribution_source")
      .all(),
    totalCampaignDiscountCost: redeemed === 0 ? 0 : null,
    netCampaignContribution: null,
    cac: null,
    ltv: null,
    insufficientData: ["completedOrders", "qrToOrderConversion", "repeatPurchaseRate", "cac", "ltv", "netCampaignContribution"],
    scansAreNotCustomers: true,
    scansAreNotSales: true,
    invented: false,
    liveCampaign: false,
  };
}

function privacyNotes() {
  return {
    qrContainsPii: false,
    scanIsNotAuthentication: true,
    marketingConsentSeparated: true,
    legalComplianceProven: false,
    reviewRequired: [
      "campaign insert rules per marketplace contract",
      "retention period for QR scans",
      "whether second-purchase discount is a marketing offer under local law",
    ],
    deletion: "revoke QR and stop new scans; entitlement rows keep canonical order ids without customer contact fields",
  };
}

function copy(locale) {
  const lang = String(locale || "de").slice(0, 2).toLowerCase();
  const table = {
    de: {
      title: "Buzzard Treue-QR",
      lead: "Scannen allein meldet Sie nicht an und gewährt keinen Rabatt.",
      discount: "Ein zweiter qualifizierter Einkauf kann bis zu 15 % erhalten, wenn die erste Bestellung nicht storniert oder zurückgegeben wurde.",
      profit: "Der Preis bleibt hinter dem bestehenden Gewinnschutz (mindestens 0,50 € Nettoproduktgewinn).",
      rights: "Gesetzliche Widerrufs- und Rückgaberechte bleiben unverändert.",
      login: "Kontoinformationen nur nach Anmeldung.",
      catalog: "Katalogmodus — die Kampagne ist nicht live.",
    },
    en: {
      title: "Buzzard loyalty QR",
      lead: "Scanning alone does not sign you in and does not grant a discount.",
      discount: "A qualifying second purchase may receive up to 15% if the first order was not cancelled or returned.",
      profit: "Pricing still enforces the existing €0.50 minimum net product profit gate.",
      rights: "Statutory cancellation and return rights stay unchanged.",
      login: "Account details appear only after sign-in.",
      catalog: "Catalog mode — this campaign is not live.",
    },
    tr: {
      title: "Buzzard sadakat QR",
      lead: "Yalnızca tarama giriş yapmaz ve indirim vermez.",
      discount: "İlk sipariş iptal veya iade edilmediyse, nitelikli ikinci alışverişte en fazla %15 uygulanabilir.",
      profit: "Fiyat, mevcut en az 0,50 € net ürün kârı kapısını korur.",
      rights: "Yasal cayma ve iade hakları değişmez.",
      login: "Hesap bilgisi yalnızca oturum açtıktan sonra gösterilir.",
      catalog: "Katalog modu — kampanya canlı değildir.",
    },
    ar: {
      title: "رمز ولاء Buzzard",
      lead: "المسح وحده لا يسجّل الدخول ولا يمنح خصمًا.",
      discount: "قد يحصل الشراء الثاني المؤهل على خصم حتى 15٪ إذا لم يُلغ الطلب الأول أو يُعاد.",
      profit: "يبقى حد الربح الصافي للمنتج 0.50 يورو ساريًا.",
      rights: "حقوق الإلغاء والإرجاع القانونية لا تتغير.",
      login: "تظهر بيانات الحساب بعد تسجيل الدخول فقط.",
      catalog: "وضع الكتالوج — الحملة غير مباشرة.",
    },
  };
  return table[lang] || table.de;
}

module.exports = {
  CAMPAIGN_CODE,
  MAX_DISCOUNT_PERCENT,
  RESERVE_TTL_MS,
  MARKETPLACE_INSERT_POLICY,
  safeRedirect,
  issueCustomerQr,
  revokeCustomerQr,
  issuePackageQr,
  recordScan,
  landingPublic,
  revealAccount,
  evaluateEligibility,
  evaluateDiscount,
  reserve,
  releaseReservation,
  expireReservations,
  redeem,
  reevaluateForOrder,
  analytics,
  privacyNotes,
  copy,
  LOYALTY_STATE,
  QR_ATTRIBUTION,
};
