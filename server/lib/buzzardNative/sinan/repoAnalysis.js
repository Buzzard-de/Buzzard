/**
 * Local repository analysis for Sinan Bey. No push, no external AI.
 */
const fs = require("fs");
const path = require("path");
const { check } = require("../core/permissionEngine");

function analyze({ actorId = "sinan_bey", root = process.cwd() } = {}) {
  if (!check(actorId, "ANALYZE_CODE").ok && actorId !== "sinan_bey") {
    return { ok: false, code: "PERMISSION_DENIED" };
  }
  const pkg = path.join(root, "package.json");
  let name = null;
  try {
    name = JSON.parse(fs.readFileSync(pkg, "utf8")).name;
  } catch {
    name = null;
  }
  return {
    ok: true,
    actorId,
    packageName: name,
    hasEgressPolicy: fs.existsSync(path.join(root, "data/security/egress_policy.v1.json")),
    hasMaster50: fs.existsSync(path.join(root, "data/taxonomy/buzzard_master_50_main_categories.json")),
    liveVerified: false,
    llmCompleted: false,
    cloneVoice: false,
  };
}

module.exports = { analyze };
