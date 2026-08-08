const fs = require("fs");
const path = require("path");

const redirectsFile = path.join(__dirname, "..", "..", "data", "buzzard_redirects.json");
const serverRedirectsFile = path.join(__dirname, "..", "data", "redirects-runtime.json");

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8") || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function listRedirects() {
  const staticRedirects = readJson(redirectsFile, []);
  const runtime = readJson(serverRedirectsFile, []);
  const map = new Map();
  for (const entry of [...staticRedirects, ...runtime]) {
    map.set(entry.from, entry);
  }
  return [...map.values()];
}

function addRedirect(entry) {
  const runtime = readJson(serverRedirectsFile, []);
  runtime.push({
    from: entry.from,
    to: entry.to,
    permanent: entry.permanent !== false,
    note: entry.note || "",
    createdAt: new Date().toISOString(),
  });
  fs.writeFileSync(serverRedirectsFile, JSON.stringify(runtime, null, 2), "utf8");
  return runtime[runtime.length - 1];
}

function findRedirect(pathname) {
  return listRedirects().find((entry) => entry.from === pathname);
}

module.exports = { listRedirects, addRedirect, findRedirect };
