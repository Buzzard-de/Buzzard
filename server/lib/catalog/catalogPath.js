const fs = require("fs");
const path = require("path");

const COMMERCE_DB = path.resolve(__dirname, "..", "..", "data", "buzzard.db");
const WORKSPACE_COMMERCE_DB = "/workspace/server/data/buzzard.db";

function refusal(code) {
  const err = new Error(code);
  err.code = code;
  return err;
}

function isProtected(candidate) {
  if (typeof candidate !== "string" || !candidate.trim() || candidate.includes("\0")) return true;
  const resolved = path.resolve(candidate.trim());
  const base = path.basename(resolved);
  if (!base || base === "buzzard.db" || base.startsWith("buzzard_guardian")) return true;
  const marker = `${path.sep}server${path.sep}data`;
  if (resolved.endsWith(marker) || resolved.includes(`${marker}${path.sep}`)) return true;
  return false;
}

function sameProtectedFile(candidate) {
  for (const protectedFile of [COMMERCE_DB, WORKSPACE_COMMERCE_DB]) {
    if (!fs.existsSync(protectedFile) || !fs.existsSync(candidate)) continue;
    try {
      const left = fs.realpathSync(candidate);
      const right = fs.realpathSync(protectedFile);
      if (left === right) return true;
      const leftStat = fs.statSync(left);
      const rightStat = fs.statSync(right);
      if (leftStat.ino === rightStat.ino && leftStat.dev === rightStat.dev) return true;
    } catch {
      return true;
    }
  }
  return false;
}

function canonicalizeCatalogPath(requested, { allowMissing = false } = {}) {
  if (typeof requested !== "string" || !requested.trim() || requested.includes("\0")) {
    throw refusal("DATA_PATH_REFUSED");
  }
  const resolved = path.resolve(requested.trim());
  if (isProtected(resolved)) throw refusal("DATA_PATH_REFUSED");
  let listed;
  try {
    listed = fs.lstatSync(resolved);
  } catch (err) {
    if (!allowMissing || !err || err.code !== "ENOENT") throw refusal("DATA_PATH_REFUSED");
    const parent = path.dirname(resolved);
    let parentReal;
    try {
      const parentStat = fs.lstatSync(parent);
      if (!parentStat.isDirectory() && !parentStat.isSymbolicLink()) throw refusal("DATA_PATH_REFUSED");
      parentReal = fs.realpathSync(parent);
    } catch (parentErr) {
      if (parentErr && parentErr.code === "DATA_PATH_REFUSED") throw parentErr;
      throw refusal("DATA_PATH_REFUSED");
    }
    if (!fs.statSync(parentReal).isDirectory()) throw refusal("DATA_PATH_REFUSED");
    const canonical = path.join(parentReal, path.basename(resolved));
    if (isProtected(canonical) || isProtected(parentReal) || sameProtectedFile(canonical)) {
      throw refusal("DATA_PATH_REFUSED");
    }
    return canonical;
  }
  if (listed.isSymbolicLink()) {
    let target;
    try {
      target = fs.realpathSync(resolved);
    } catch {
      throw refusal("DATA_PATH_REFUSED");
    }
    if (isProtected(target) || sameProtectedFile(target) || !fs.statSync(target).isFile()) {
      throw refusal("DATA_PATH_REFUSED");
    }
    return target;
  }
  if (!listed.isFile()) throw refusal("DATA_PATH_REFUSED");
  let canonical;
  try {
    canonical = fs.realpathSync(resolved);
  } catch {
    throw refusal("DATA_PATH_REFUSED");
  }
  if (isProtected(canonical) || sameProtectedFile(canonical)) throw refusal("DATA_PATH_REFUSED");
  return canonical;
}

module.exports = {
  canonicalizeCatalogPath,
  refusal,
};
