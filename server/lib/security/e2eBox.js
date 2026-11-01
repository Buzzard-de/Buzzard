/**
 * Client-held X25519 keys + AES-256-GCM. Server can store ciphertext only.
 */
const crypto = require("crypto");

function generateIdentity() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("x25519");
  return {
    publicKey: publicKey.export({ type: "spki", format: "der" }).toString("base64"),
    privateKey: privateKey.export({ type: "pkcs8", format: "der" }).toString("base64"),
  };
}

function loadPrivate(privateKeyB64) {
  return crypto.createPrivateKey({
    key: Buffer.from(privateKeyB64, "base64"),
    format: "der",
    type: "pkcs8",
  });
}

function loadPublic(publicKeyB64) {
  return crypto.createPublicKey({
    key: Buffer.from(publicKeyB64, "base64"),
    format: "der",
    type: "spki",
  });
}

function sharedKey(privateKeyB64, publicKeyB64) {
  const secret = crypto.diffieHellman({
    privateKey: loadPrivate(privateKeyB64),
    publicKey: loadPublic(publicKeyB64),
  });
  return Buffer.from(crypto.hkdfSync("sha256", secret, Buffer.alloc(0), "buzzard-e2e-v1", 32));
}

function seal(plaintext, senderPrivate, recipientPublic) {
  const key = sharedKey(senderPrivate, recipientPublic);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  return {
    alg: "x25519-aes-256-gcm",
    iv: iv.toString("base64"),
    ct: encrypted.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
}

function open(box, recipientPrivate, senderPublic) {
  const key = sharedKey(recipientPrivate, senderPublic);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(box.iv, "base64"));
  decipher.setAuthTag(Buffer.from(box.tag, "base64"));
  const plain = Buffer.concat([decipher.update(Buffer.from(box.ct, "base64")), decipher.final()]);
  return plain.toString("utf8");
}

module.exports = { generateIdentity, seal, open };
