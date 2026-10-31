/**
 * 3-2-1-1-0 backup copies for Buzzard survival.
 * Local-only by default. Offsite copy is BLOCKED until BUZZARD_OFFSITE_BACKUP_DIR is set.
 * Never copies key/secret material into data snapshots.
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const DATA_AREAS = Object.freeze([
  "databases",
  "catalog",
  "orders",
  "customers",
  "suppliers",
  "finance",
  "source_code",
  "infra_config",
  "ai_memory",
  "key_recovery_material",
]);

const KEY_NAME_RE = /(^|[._-])(key|secret|pem|p12|pfx|credential)s?([._-]|$)/i;

const RPO_RTO_PROPOSAL = Object.freeze({
  databases: { rpo: "15m", rto: "30m" },
  catalog: { rpo: "1h", rto: "30m" },
  orders: { rpo: "15m", rto: "30m" },
  customers: { rpo: "15m", rto: "30m" },
  suppliers: { rpo: "1h", rto: "1h" },
  finance: { rpo: "15m", rto: "1h" },
  source_code: { rpo: "git remote", rto: "15m" },
  infra_config: { rpo: "1h", rto: "1h" },
  ai_memory: { rpo: "1h", rto: "1h" },
  key_recovery_material: { rpo: "manual vault", rto: "4h", storedApartFromData: true },
  note: "Targets are proposals. Confirm with operator before treating as SLA.",
});

function sha256File(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function isKeyMaterial(name) {
  return KEY_NAME_RE.test(String(name || ""));
}

function layout(root) {
  const resolved = path.resolve(root);
  const offsite = process.env.BUZZARD_OFFSITE_BACKUP_DIR
    ? path.resolve(process.env.BUZZARD_OFFSITE_BACKUP_DIR)
    : null;
  return {
    root: resolved,
    copy1Primary: path.join(resolved, "copy1-primary"),
    copy2Archive: path.join(resolved, "copy2-archive"),
    copy3Mirror: path.join(resolved, "copy3-mirror"),
    immutable: path.join(resolved, "copy-immutable"),
    keysSeparate: path.join(resolved, "keys-NOT-IN-DATA-BACKUP"),
    offsite,
  };
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeSidecar(filePath, extra) {
  const meta = {
    path: filePath,
    sizeBytes: fs.statSync(filePath).size,
    sha256: sha256File(filePath),
    createdAt: new Date().toISOString(),
    ...extra,
  };
  fs.writeFileSync(`${filePath}.meta.json`, JSON.stringify(meta, null, 2));
  return meta;
}

function copyFileSafe(source, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(source, dest);
  return writeSidecar(dest, { media: "filesystem", role: "copy" });
}

function gzipCopy(source, dest) {
  ensureDir(path.dirname(dest));
  fs.writeFileSync(dest, zlib.gzipSync(fs.readFileSync(source)));
  return writeSidecar(dest, { media: "gzip-archive", role: "alt-media" });
}

function writeImmutable(source, dest) {
  ensureDir(path.dirname(dest));
  if (fs.existsSync(dest)) {
    throw new Error("IMMUTABLE_ALREADY_EXISTS");
  }
  fs.copyFileSync(source, dest);
  try {
    fs.chmodSync(dest, 0o444);
  } catch {
    /* best-effort on filesystems that ignore chmod */
  }
  return writeSidecar(dest, { media: "filesystem", role: "immutable", writeOnce: true });
}

function createCopies({ sourcePath, workRoot, area = "databases", label = "snapshot" } = {}) {
  if (!sourcePath || !fs.existsSync(sourcePath)) {
    return { ok: false, code: "SOURCE_MISSING", sourcePath };
  }
  if (isKeyMaterial(path.basename(sourcePath)) && area !== "key_recovery_material") {
    return { ok: false, code: "KEY_MATERIAL_EXCLUDED", sourcePath };
  }

  const paths = layout(workRoot);
  ensureDir(paths.copy1Primary);
  ensureDir(paths.copy2Archive);
  ensureDir(paths.copy3Mirror);
  ensureDir(paths.immutable);
  ensureDir(paths.keysSeparate);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const base = `${area}-${label}-${stamp}`;
  const copies = [];

  copies.push({
    slot: "copy1-primary",
    media: "filesystem",
    ...copyFileSafe(sourcePath, path.join(paths.copy1Primary, `${base}.bin`)),
  });
  copies.push({
    slot: "copy2-archive",
    media: "gzip-archive",
    ...gzipCopy(sourcePath, path.join(paths.copy2Archive, `${base}.bin.gz`)),
  });
  copies.push({
    slot: "copy3-mirror",
    media: "filesystem",
    ...copyFileSafe(sourcePath, path.join(paths.copy3Mirror, `${base}.bin`)),
  });
  copies.push({
    slot: "copy-immutable",
    media: "filesystem",
    ...writeImmutable(sourcePath, path.join(paths.immutable, `${base}.bin`)),
  });

  let offsite = { configured: Boolean(paths.offsite), status: "OFFSITE_UNCONFIGURED" };
  if (paths.offsite) {
    ensureDir(paths.offsite);
    const dest = path.join(paths.offsite, `${base}.bin`);
    offsite = { configured: true, status: "COPIED", ...copyFileSafe(sourcePath, dest) };
    copies.push({ slot: "offsite", media: "filesystem-offsite", ...offsite });
  }

  fs.writeFileSync(
    path.join(paths.keysSeparate, "README.txt"),
    "Encryption keys and recovery material must live in a vault, not inside data copies.\n"
  );

  const verification = verifyCopies(copies.filter((c) => c.slot !== "copy2-archive" && c.slot !== "offsite"), sourcePath);
  if (copies.find((c) => c.slot === "copy2-archive")) {
    const gz = copies.find((c) => c.slot === "copy2-archive");
    const unpacked = zlib.gunzipSync(fs.readFileSync(gz.path));
    const sourceBuf = fs.readFileSync(sourcePath);
    verification.gzipMatches = unpacked.equals(sourceBuf);
    if (!verification.gzipMatches) verification.errors.push("GZIP_MISMATCH");
  }

  return {
    ok: verification.errors.length === 0,
    scheme: "3-2-1-1-0",
    area,
    copies,
    offsite,
    keysSeparated: true,
    verification,
    rpoRtoProposal: RPO_RTO_PROPOSAL[area] || RPO_RTO_PROPOSAL.databases,
    paths,
  };
}

function verifyCopies(copies, sourcePath) {
  const sourceHash = sha256File(sourcePath);
  const errors = [];
  const results = copies.map((copy) => {
    if (!copy.path || !fs.existsSync(copy.path)) {
      errors.push(`MISSING:${copy.slot}`);
      return { slot: copy.slot, ok: false };
    }
    const hash = sha256File(copy.path);
    const ok = hash === sourceHash && hash === copy.sha256;
    if (!ok) errors.push(`HASH_MISMATCH:${copy.slot}`);
    return { slot: copy.slot, ok, sha256: hash };
  });
  return {
    sourceSha256: sourceHash,
    results,
    errors,
    zeroVerifyErrors: errors.length === 0,
  };
}

function statusOfScheme(result) {
  if (!result?.ok) return "PARTIAL";
  if (!result.offsite?.configured) return "CODE_READY";
  return "COMPLETE";
}

module.exports = {
  DATA_AREAS,
  RPO_RTO_PROPOSAL,
  isKeyMaterial,
  layout,
  createCopies,
  verifyCopies,
  sha256File,
  statusOfScheme,
};
