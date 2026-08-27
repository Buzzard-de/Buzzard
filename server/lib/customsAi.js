/** Customs AI — GTIP/TARIC prep with human review (P1-10). Never present uncertain results as certain. */

const productValidator = require("./productValidator");
const productAi = require("./productAi");

function inferCustomsHints(product) {
  const category = String(product.category_id || "").toLowerCase();
  const name = String(product.name || "").toLowerCase();

  let gtip = "";
  let confidence = 0.35;
  let source = "heuristic_demo";

  if (category.includes("automotive") || /brem|filter|öl|motor/.test(name)) {
    gtip = "8708";
    confidence = 0.45;
  } else if (category.includes("textil") || /textil|hemd|hose/.test(name)) {
    gtip = "6204";
    confidence = 0.4;
  }

  return {
    gtip,
    taric: gtip ? `${gtip}9090` : "",
    origin_country: product.customs?.origin_country || "DE",
    duty_rate: null,
    import_restricted: false,
    source,
    confidence,
    review_required: true,
  };
}

function assessCustoms(product) {
  const existing = product.customs && typeof product.customs === "object" ? product.customs : null;
  const hints = existing?.gtip ? existing : inferCustomsHints(product);

  const normalized = productValidator.validateCustoms(hints);
  const customs = normalized.value || hints;

  if (customs.review_required || (customs.confidence != null && customs.confidence < 0.75)) {
    productAi.enqueueReview({
      type: "customs_classification",
      product_id: product.id || product.sku,
      payload: customs,
      source: customs.source,
      confidence: customs.confidence,
      message: "Customs classification requires human review — do not treat as legal certainty.",
    });
  }

  return {
    customs,
    review_required: customs.review_required,
    disclaimer: "AI-generated customs hint only — not legal/tariff advice.",
  };
}

module.exports = {
  assessCustoms,
  inferCustomsHints,
};
