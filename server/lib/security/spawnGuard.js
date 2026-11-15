const path = require("path");
const { isForbiddenRuntimeBinary } = require("./subprocessInventory");

const UNSAFE = /[;&|`$<>\n\r]/;

function assertSafeSpawn({ file, args = [], shell = false } = {}) {
  if (shell) return { ok: false, code: "SHELL_SPAWN_DENIED" };
  if (!file) return { ok: false, code: "EXECUTABLE_REQUIRED" };
  if (isForbiddenRuntimeBinary(file)) return { ok: false, code: "FORBIDDEN_RUNTIME_BINARY" };
  const resolved = path.resolve(String(file));
  if (resolved.includes("..") || String(file).includes("..")) {
    return { ok: false, code: "PATH_TRAVERSAL" };
  }
  for (const arg of args) {
    if (UNSAFE.test(String(arg))) return { ok: false, code: "UNSAFE_ARG" };
  }
  return { ok: true, file: resolved, args: [...args], shell: false };
}

module.exports = { assertSafeSpawn };
