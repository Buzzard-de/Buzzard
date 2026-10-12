const fs = require("fs");
const os = require("os");
const path = require("path");

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function defaultHome() {
  return process.env.BUZZARD_BRIDGE_HOME || path.join(os.homedir(), ".buzzard-desktop-bridge");
}

function normalize(candidate) {
  if (candidate == null || String(candidate).trim() === "") {
    throw fail("PATH_REQUIRED", "Workspace path is required");
  }
  const raw = String(candidate).replace(/\0/g, "");
  if (raw !== String(candidate)) {
    throw fail("PATH_INVALID", "Path contains a null byte");
  }
  return path.resolve(raw);
}

function isInside(root, candidate) {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(candidate);
  if (resolved === resolvedRoot) return true;
  const prefix = resolvedRoot.endsWith(path.sep) ? resolvedRoot : resolvedRoot + path.sep;
  return resolved.startsWith(prefix);
}

function assertAuthorized(candidate, roots = []) {
  const resolved = normalize(candidate);
  const list = Array.isArray(roots) ? roots.filter(Boolean) : [];
  if (!list.length) {
    throw fail("WORKSPACE_NOT_AUTHORIZED", "No authorized workspace roots are configured");
  }
  const allowed = list.some((root) => isInside(root, resolved));
  if (!allowed) {
    throw fail("PATH_TRAVERSAL", "Path is outside authorized workspace roots");
  }
  return resolved;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function writeAtomic(file, contents) {
  ensureDir(path.dirname(file));
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, contents, { encoding: "utf8", mode: 0o600 });
  fs.renameSync(tmp, file);
}

module.exports = {
  defaultHome,
  normalize,
  isInside,
  assertAuthorized,
  ensureDir,
  writeAtomic,
};
