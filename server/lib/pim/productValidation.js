const { db } = require("../db");
const { VALIDATION_STATUS } = require("../../core/productConstants");
const productValidator = require("../productValidator");
const productIdentifiers = require("./productIdentifiers");

function validateField(name, status, detail) {
  return { field: name, status, detail };
}

function validateProduct(product) {
  const results = [];

  if (!product.sku) results.push(validateField("sku", VALIDATION_STATUS.FAIL, "Missing SKU"));
  else results.push(validateField("sku", VALIDATION_STATUS.PASS, product.sku));

  const eanCheck = productValidator.validateEan(product.ean || product.gtin);
  results.push(
    validateField(
      "ean",
      eanCheck.ok ? (eanCheck.warning ? VALIDATION_STATUS.WARNING : VALIDATION_STATUS.PASS) : VALIDATION_STATUS.FAIL,
      eanCheck.error || eanCheck.value || eanCheck.warning
    )
  );

  const idIssues = productIdentifiers.checkIdentifiers({
    sku: product.sku,
    ean: product.ean,
    gtin: product.gtin,
    mpn: product.mpn,
    excludeId: product.id,
  });
  if (idIssues.length) {
    results.push(validateField("identifiers", VALIDATION_STATUS.FAIL, idIssues));
  } else {
    results.push(validateField("identifiers", VALIDATION_STATUS.PASS, "unique"));
  }

  results.push(
    validateField("brand", product.brandId ? VALIDATION_STATUS.PASS : VALIDATION_STATUS.WARNING, product.brandId || "missing")
  );
  results.push(
    validateField("title", product.title?.length >= 3 ? VALIDATION_STATUS.PASS : VALIDATION_STATUS.FAIL, "title")
  );
  results.push(
    validateField(
      "description",
      product.description?.length >= 10 ? VALIDATION_STATUS.PASS : VALIDATION_STATUS.WARNING,
      "description"
    )
  );
  results.push(
    validateField("category", product.category ? VALIDATION_STATUS.PASS : VALIDATION_STATUS.WARNING, product.category || "missing")
  );
  results.push(
    validateField(
      "images",
      product.images?.length ? VALIDATION_STATUS.PASS : VALIDATION_STATUS.WARNING,
      `${product.images?.length || 0} images`
    )
  );
  results.push(
    validateField("price", product.price > 0 ? VALIDATION_STATUS.PASS : VALIDATION_STATUS.WARNING, product.price)
  );
  results.push(
    validateField("stock", product.stock >= 0 ? VALIDATION_STATUS.PASS : VALIDATION_STATUS.FAIL, product.stock)
  );
  results.push(
    validateField("supplier", product.supplier ? VALIDATION_STATUS.PASS : VALIDATION_STATUS.WARNING, product.supplier || "none")
  );

  const fails = results.filter((r) => r.status === VALIDATION_STATUS.FAIL).length;
  const warnings = results.filter((r) => r.status === VALIDATION_STATUS.WARNING).length;
  const overall =
    fails > 0 ? VALIDATION_STATUS.FAIL : warnings > 0 ? VALIDATION_STATUS.WARNING : VALIDATION_STATUS.PASS;

  return { overall, results, failCount: fails, warningCount: warnings };
}

module.exports = { validateProduct, validateField };
