/**
 * Which files the API's static fallback may serve.
 *
 * The API runs from the repository root. Without a list, every file below it
 * is one GET away: server/data (admin sessions, password hashes, SQLite),
 * data/ seed files with demo passwords, source, .git and .env files. Only the
 * public asset directories and top-level HTML files are served; everything
 * else is reported as not found.
 */
const fs = require("fs");
const path = require("path");

const PUBLIC_DIRS = ["public", "logo", "styles"];
const ROOT_HTML = /^[A-Za-z0-9][A-Za-z0-9_-]*\.html$/;

function isInside(parent, child) {
  const rel = path.relative(parent, child);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}

/** Absolute path of the file to serve for a request path, or null. */
function resolvePublicFile(rootDir, pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(String(pathname || ""));
  } catch {
    return null;
  }
  if (decoded.includes("\0") || decoded.includes("\\")) return null;
  // A second layer of encoding (%252e%252e → %2e%2e) never names a real file
  // here; refusing it outright keeps a later decoder from turning it into "..".
  if (/%(?:2e|2f|5c|00|25)/i.test(decoded)) return null;

  const segments = path.posix
    .normalize(`/${decoded}`)
    .split("/")
    .filter(Boolean);
  if (segments.length === 0) segments.push("index.html");
  if (segments.some((segment) => segment.startsWith("."))) return null;

  const allowed = segments.length === 1 ? ROOT_HTML.test(segments[0]) : PUBLIC_DIRS.includes(segments[0]);
  if (!allowed) return null;

  try {
    const root = fs.realpathSync(rootDir);
    let file = path.join(root, ...segments);
    if (fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    const real = fs.realpathSync(file);
    if (!fs.statSync(real).isFile()) return null;
    const within =
      segments.length === 1
        ? path.dirname(real) === root
        : PUBLIC_DIRS.some((dir) => isInside(path.join(root, dir), real));
    return within ? real : null;
  } catch {
    return null;
  }
}

module.exports = { resolvePublicFile, PUBLIC_DIRS };
