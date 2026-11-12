import { describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const adminTwoFactor = require("../lib/adminTwoFactor.js");
const { generateSecret } = require("../lib/totp.js");

function currentTotp(secret) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  const output = [];
  for (const char of String(secret).toUpperCase()) {
    const idx = alphabet.indexOf(char);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  const counter = Math.floor(Date.now() / 30000);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", Buffer.from(output)).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const code =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(code % 1000000).padStart(6, "0");
}

const secret = `admin-secret-${Date.now()}@example.test`;

describe("admin two-factor setup does not reveal a secret or an email", () => {
  it("returns an empty setup and does not enable from a caller code", () => {
    const setup = adminTwoFactor.beginSetup(secret);
    expect(setup.ok).toBe(false);
    expect(setup.secret).toBeNull();
    expect(setup.otpauthUri).toBeNull();
    expect(setup.email).toBeNull();
    expect(setup.enabled).toBe(false);
    expect(JSON.stringify(setup)).not.toContain(secret);
    expect(setup.otpauthUri).toBeNull();

    const enabled = adminTwoFactor.completeSetup(secret, "123456");
    expect(enabled.ok).toBe(false);
    expect(enabled.enabled).toBe(false);
    expect(JSON.stringify(enabled)).not.toContain(secret);
    expect(adminTwoFactor.isEnabled(secret)).toBe(false);

    const first = adminTwoFactor.disable(secret, "123456");
    const second = adminTwoFactor.disable(secret, "123456");
    expect(first.ok).toBe(false);
    expect(second.ok).toBe(false);
    expect(first.secret).toBeNull();
    expect(first.email).toBeNull();
    expect(JSON.stringify(first)).not.toContain(secret);
    expect(JSON.stringify(second)).not.toContain(secret);
  });

  it("does not return an admin email from the audit list", () => {
    process.env.BUZZARD_AUDIT_DIR = mkdtempSync(join(tmpdir(), "buzzard-audit-"));
    const coreAudit = require("../lib/coreAudit.js");
    coreAudit.logAudit({
      userId: "admin-1",
      userEmail: secret,
      action: "admin.note",
      entityType: "admin",
      ip: "203.0.113.8",
      userAgent: "secret-agent",
    });
    const rows = coreAudit.listAudit(5);
    expect(rows).toHaveLength(1);
    expect(rows[0].userEmail).toBeNull();
    expect(rows[0].ip).toBeNull();
    expect(rows[0].userAgent).toBeNull();
    expect(JSON.stringify(rows)).not.toContain(secret);
  });

  it("keeps a challenge single-use and keeps the address out of the token", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-12T18:00:00Z"));
    const email = `challenge-${Date.now()}@example.test`;
    const user = { id: "admin-1", email, name: "Ada", role: "administrator" };
    const token = adminTwoFactor.createChallenge(user);
    expect(token.includes(email)).toBe(false);
    expect(token.includes("@")).toBe(false);
    const first = adminTwoFactor.consumeChallenge(token);
    expect(first.email).toBeNull();
    expect(first.userId).toBe("admin-1");
    expect(adminTwoFactor.consumeChallenge(token)).toBeNull();
    expect(JSON.stringify(first)).not.toContain(email);

    const cancelled = adminTwoFactor.createChallenge(user);
    expect(adminTwoFactor.cancelChallenge(cancelled)).toBe(true);
    expect(adminTwoFactor.consumeChallenge(cancelled)).toBeNull();

    const expiring = adminTwoFactor.createChallenge(user);
    vi.advanceTimersByTime(5 * 60 * 1000 + 1);
    expect(adminTwoFactor.consumeChallenge(expiring)).toBeNull();
    const rejected = adminTwoFactor.acceptChallenge(expiring, "000000");
    expect(rejected.ok).toBe(false);
    expect(rejected.email).toBeNull();
    expect(JSON.stringify(rejected)).not.toContain(email);
    vi.useRealTimers();
  });

  it("accepts a challenge by user id and does not return the admin email", () => {
    const directory = mkdtempSync(join(tmpdir(), "buzzard-admin-2fa-"));
    process.env.BUZZARD_ADMIN_2FA_PATH = join(directory, "admin-2fa.json");
    const email = `legacy-${Date.now()}@example.test`;
    const authenticator = generateSecret();
    writeFileSync(process.env.BUZZARD_ADMIN_2FA_PATH, JSON.stringify({
      [email]: { enabled: true, secret: "SHOULDNOTLEAK", userId: null },
      "user:admin-9": { enabled: true, secret: authenticator, userId: "admin-9", email },
    }));

    expect(adminTwoFactor.isEnabled(email)).toBe(false);
    expect(adminTwoFactor.isEnabled("admin-9")).toBe(true);
    const stored = readFileSync(process.env.BUZZARD_ADMIN_2FA_PATH, "utf8");
    expect(stored.includes(email)).toBe(false);
    expect(stored.includes("SHOULDNOTLEAK")).toBe(false);

    const user = { id: "admin-9", email, name: "Ada", role: "administrator" };
    const code = currentTotp(authenticator);
    const wrongCode = code === "000000" ? "111111" : "000000";
    const token = adminTwoFactor.createChallenge(user);
    const wrong = adminTwoFactor.acceptChallenge(token, wrongCode);
    const reused = adminTwoFactor.acceptChallenge(token, code);
    expect(wrong.ok).toBe(false);
    expect(wrong.email).toBeNull();
    expect(reused.ok).toBe(false);
    expect(JSON.stringify(wrong)).not.toContain(email);
    expect(JSON.stringify(wrong)).not.toContain(authenticator);

    const again = adminTwoFactor.createChallenge(user);
    const [first, second] = [
      adminTwoFactor.acceptChallenge(again, code),
      adminTwoFactor.acceptChallenge(again, code),
    ];
    expect([first, second].filter((row) => row.ok)).toHaveLength(1);
    expect(first.email).toBeNull();
    expect(second.email).toBeNull();
    expect(JSON.stringify(first)).not.toContain(email);
    expect(JSON.stringify(second)).not.toContain(email);
    expect(adminTwoFactor.acceptChallenge(again, code).ok).toBe(false);
    delete process.env.BUZZARD_ADMIN_2FA_PATH;
  });
});
