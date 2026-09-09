/**
 * Automotive Core Engine safety contract — fail-closed, no live activation.
 */
const { GLOBAL_SAFETY_POLICY } = require("../globalSafetyPolicy");

const AUTOMOTIVE_CORE_SAFETY = Object.freeze({
  ...GLOBAL_SAFETY_POLICY,
  tecdocEnabled: false,
  tecdocDryRun: true,
  supplierApiLive: false,
  supplierXmlLive: false,
  orderLiveEnabled: false,
  automotivePublishEnabled: false,
  automotiveAutoActivate: false,
});

function assertAutomotiveCoreSafety() {
  const tecdocLive = process.env.TECDOC_ENABLED === "1" && process.env.TECDOC_DRY_RUN !== "1";
  const supplierApiLive = process.env.SUPPLIER_API_LIVE === "1";
  const supplierXmlLive = process.env.SUPPLIER_XML_LIVE === "1";
  const orderLive = process.env.ORDER_LIVE_ENABLED === "1";
  const autoPublish =
    process.env.AUTOMOTIVE_PUBLISH_ENABLED === "1" || process.env.AUTOMOTIVE_AUTO_ACTIVATE === "1";

  return {
    ...AUTOMOTIVE_CORE_SAFETY,
    tecdocEnabled: process.env.TECDOC_ENABLED === "1",
    tecdocDryRun: process.env.TECDOC_DRY_RUN !== "0",
    supplierApiLive,
    supplierXmlLive,
    orderLiveEnabled: orderLive,
    automotivePublishEnabled: process.env.AUTOMOTIVE_PUBLISH_ENABLED === "1",
    automotiveAutoActivate: process.env.AUTOMOTIVE_AUTO_ACTIVATE === "1",
    compliant:
      !tecdocLive &&
      !supplierApiLive &&
      !supplierXmlLive &&
      !orderLive &&
      !autoPublish &&
      GLOBAL_SAFETY_POLICY.status === "BLOCKED",
  };
}

module.exports = {
  AUTOMOTIVE_CORE_SAFETY,
  assertAutomotiveCoreSafety,
};
