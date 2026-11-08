const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

function sha(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function lab32110(payload = Buffer.from("sinan-memory-lab")) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-nai-32110-"));
  const copies = ["c1", "c2", "c3"].map((name) => {
    const p = path.join(root, `${name}.bin`);
    fs.writeFileSync(p, payload);
    return { path: p, sha256: sha(fs.readFileSync(p)), media: "local_disk" };
  });
  const t0 = Date.now();
  fs.writeFileSync(copies[2].path, Buffer.from("tamper"));
  const tampered = sha(fs.readFileSync(copies[2].path)) !== copies[0].sha256;
  fs.writeFileSync(copies[2].path, payload);
  const rtoMs = Date.now() - t0;
  return {
    ok: true,
    copies: copies.length,
    mediaKinds: 1,
    offsite: false,
    worm: false,
    scheme: "LOCAL_3_COPIES_NOT_32110_COMPLETE",
    tamperDetected: tampered,
    rpoMs: 0,
    rtoMs,
    completeClaim: false,
  };
}

module.exports = { lab32110, sha };
