/**
 * Local SRTP (RFC 3711 AES-CM + HMAC-SHA1-80) for the SIP lab.
 * This is not a carrier call and it does not negotiate keys on the public network.
 */
const crypto = require("crypto");

const LAB_MASTER_KEY = Buffer.from("E1F97A0D3E018BE0D64FA32C06DE4139", "hex");
const LAB_MASTER_SALT = Buffer.from("0EC675AD498AFEEBB6960B3AABE6", "hex");

function derive(masterKey, masterSalt, label, length) {
  const iv = Buffer.alloc(16);
  masterSalt.copy(iv, 0);
  iv[7] ^= label;
  return crypto.createCipheriv("aes-128-ctr", masterKey, iv).update(Buffer.alloc(length));
}

function sessionFromMaster(masterKey = LAB_MASTER_KEY, masterSalt = LAB_MASTER_SALT) {
  return {
    key: derive(masterKey, masterSalt, 0x00, 16),
    auth: derive(masterKey, masterSalt, 0x01, 20),
    salt: derive(masterKey, masterSalt, 0x02, 14),
  };
}

function packetIv(salt, ssrc, roc, seq) {
  const iv = Buffer.alloc(16);
  salt.copy(iv, 0);
  iv.writeUInt32BE((iv.readUInt32BE(4) ^ ssrc) >>> 0, 4);
  const indexHi = (iv.readUInt32BE(8) ^ roc) >>> 0;
  const indexLo = (iv.readUInt16BE(12) ^ seq) & 0xffff;
  iv.writeUInt32BE(indexHi, 8);
  iv.writeUInt16BE(indexLo, 12);
  return iv;
}

function keystream(session, ssrc, roc, seq, length) {
  const iv = packetIv(session.salt, ssrc, roc, seq);
  return crypto.createCipheriv("aes-128-ctr", session.key, iv).update(Buffer.alloc(length));
}

function tagFor(authKey, body, roc) {
  const rocBuf = Buffer.alloc(4);
  rocBuf.writeUInt32BE(roc);
  return crypto.createHmac("sha1", authKey).update(body).update(rocBuf).digest().subarray(0, 10);
}

function protectSrtp(session, rtp, roc = 0) {
  const header = rtp.subarray(0, 12);
  const payload = rtp.subarray(12);
  const stream = keystream(session, header.readUInt32BE(8), roc, header.readUInt16BE(2), payload.length);
  const encrypted = Buffer.alloc(payload.length);
  for (let i = 0; i < payload.length; i += 1) encrypted[i] = payload[i] ^ stream[i];
  const body = Buffer.concat([header, encrypted]);
  return Buffer.concat([body, tagFor(session.auth, body, roc)]);
}

function unprotectSrtp(session, packet, roc = 0) {
  if (!Buffer.isBuffer(packet) || packet.length < 22) return null;
  const body = packet.subarray(0, packet.length - 10);
  const tag = packet.subarray(packet.length - 10);
  const expected = tagFor(session.auth, body, roc);
  if (tag.length !== expected.length || !crypto.timingSafeEqual(tag, expected)) return null;
  const header = body.subarray(0, 12);
  const encrypted = body.subarray(12);
  const stream = keystream(session, header.readUInt32BE(8), roc, header.readUInt16BE(2), encrypted.length);
  const payload = Buffer.alloc(encrypted.length);
  for (let i = 0; i < encrypted.length; i += 1) payload[i] = encrypted[i] ^ stream[i];
  return payload;
}

module.exports = {
  LAB_MASTER_KEY,
  LAB_MASTER_SALT,
  sessionFromMaster,
  protectSrtp,
  unprotectSrtp,
};
