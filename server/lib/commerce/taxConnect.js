/**
 * Tax Connect adapter. Never files or pays. Credentials absent => BLOCKED.
 */
const REQUIRED = Object.freeze(["BUZZARD_TAX_CONNECT_URL", "BUZZARD_TAX_CONNECT_KEY"]);

function assess() {
  const missing = REQUIRED.filter((key) => !process.env[key]);
  return {
    status: missing.length ? "BLOCKED" : "CODE_READY",
    connected: false,
    filingEnabled: false,
    missing,
    note: missing.length
      ? "No Tax Connect account. Estimates only; do not file."
      : "Credentials present — live filing still requires human approval.",
  };
}

function submitFiling() {
  return {
    ok: false,
    code: "TAX_CONNECT_BLOCKED",
    ...assess(),
  };
}

module.exports = { REQUIRED, assess, submitFiling };
