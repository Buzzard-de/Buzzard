const productSot = require("./productSot");

function rejectLegacyProductWrite(res, source) {
  try {
    productSot.assertCanonicalWrite(source);
    return false;
  } catch (err) {
    res.status(err.status || 423).json({
      success: false,
      error: err.message,
      code: err.code || "product_sot_legacy_locked",
      productSot: productSot.getStatus(),
    });
    return true;
  }
}

module.exports = { rejectLegacyProductWrite };
