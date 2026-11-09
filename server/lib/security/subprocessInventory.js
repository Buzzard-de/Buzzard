/**
 * Local subprocess inventory. Presence of spawn/exec is not network access.
 * Runtime must not spawn npm, pip, curl, wget, or a shell pipeline to the internet.
 */
const LOCAL_BINARIES = Object.freeze([
  { binary: "nvidia-smi", file: "server/lib/buzzardNative/thinking/hardwareProbe.js", network: false },
  { binary: "git", file: "server/lib/deploymentIdentity.js", network: false, note: "rev-parse only" },
  { binary: "execSync", file: "server/lib/backupAutomation.js", network: false, note: "local backup dir; review command string if changed" },
  { binary: "python3", file: "scripts/run-production-guard.mjs", network: "child_may_http", note: "child now uses guarded_urlopen" },
]);

const RUNTIME_FORBIDDEN = Object.freeze(["npm", "npx", "pip", "pip3", "curl", "wget", "ssh"]);

function isForbiddenRuntimeBinary(cmd) {
  const name = String(cmd || "").trim().split(/\s+/)[0].split(/[\\/]/).pop();
  return RUNTIME_FORBIDDEN.includes(name);
}

module.exports = { LOCAL_BINARIES, RUNTIME_FORBIDDEN, isForbiddenRuntimeBinary };
