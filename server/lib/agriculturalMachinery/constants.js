const { COMPATIBILITY_STATES, EVIDENCE_TYPES, APPROVED_EVIDENCE_TYPES } = require("../constructionMachinery/constants");

const ENGINE_ID = "agricultural-machinery-search-compatibility";
const RULE_VERSION = "ame-compat-1.0.0";
const DOMAIN = "agricultural";
const SHOP_L1_ID = "cat-20";
const ID_PREFIX = "ame";

module.exports = {
  COMPATIBILITY_STATES,
  EVIDENCE_TYPES,
  APPROVED_EVIDENCE_TYPES,
  VERIFICATION_STATUS: require("../constructionMachinery/constants").VERIFICATION_STATUS,
  QUALITY_STATUS: require("../constructionMachinery/constants").QUALITY_STATUS,
  CONNECTOR_STATUS: require("../constructionMachinery/constants").CONNECTOR_STATUS,
  IMPORT_JOB_STATUS: require("../constructionMachinery/constants").IMPORT_JOB_STATUS,
  ERROR_CLASS: require("../constructionMachinery/constants").ERROR_CLASS,
  RELATION_KIND: require("../constructionMachinery/constants").RELATION_KIND,
  INVENTORY_TRUST: require("../constructionMachinery/constants").INVENTORY_TRUST,
  ENGINE_ID,
  RULE_VERSION,
  DOMAIN,
  SHOP_L1_ID,
  ID_PREFIX,
};
