/**
 * Separate evidence flags. A quoted register row is not an API, SEPA, or live proof.
 */
const FIELDS = Object.freeze([
  "REGISTRY_VERIFIED",
  "OWNERSHIP_VERIFIED",
  "PAYMENT_CAPABILITY_VERIFIED",
  "SEPA_MEMBERSHIP_VERIFIED",
  "API_DOCUMENTATION_VERIFIED",
  "SANDBOX_VERIFIED",
  "LIVE_VERIFIED",
]);

function listedOnCitedRegister(row) {
  return Boolean(
    row
    && row.verificationStatus === "SOURCE_QUOTED"
    && row.officialName
    && typeof row.sourceUrl === "string"
    && row.sourceUrl.startsWith("https://")
    && String(row.licenseStatus || "").startsWith("LISTED_ON_")
  );
}

function evidenceOf(row) {
  const ownership = row && (row.ownershipClass === "STATE" || row.ownershipClass === "PRIVATE");
  const sepa = row && row.sepa === "STATED_MEMBER";
  const payments = row && row.acceptanceSupport === "STATED_YES";
  const api = row && row.apiDocumentReviewed === true && typeof row.apiDocumentUrl === "string";
  const sandbox = row && row.sandboxReviewed === true && row.connectorStatus === "SANDBOX_VERIFIED";
  const live = row && row.connectorStatus === "LIVE_VERIFIED" && row.live === true;
  return {
    REGISTRY_VERIFIED: listedOnCitedRegister(row),
    OWNERSHIP_VERIFIED: Boolean(ownership),
    PAYMENT_CAPABILITY_VERIFIED: Boolean(payments),
    SEPA_MEMBERSHIP_VERIFIED: Boolean(sepa),
    API_DOCUMENTATION_VERIFIED: Boolean(api),
    SANDBOX_VERIFIED: Boolean(sandbox),
    LIVE_VERIFIED: Boolean(live),
    basis: listedOnCitedRegister(row) ? "QUOTED_FROM_CITED_REGISTER" : "NO_REGISTER_ROW",
  };
}

module.exports = { FIELDS, evidenceOf };
