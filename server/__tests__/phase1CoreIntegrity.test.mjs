import { chmodSync, existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  evaluatePhase1CoreIntegrity,
  checkProtectedDataIntegrity,
  PROTECTED_FILES,
  DATA_STATES,
} = require("../lib/platform/phase1CoreIntegrity.js");

const REPO = path.resolve(new URL("../..", import.meta.url).pathname);
const temps = [];

afterEach(() => {
  while (temps.length) {
    const dir = temps.pop();
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      chmodSync(dir, 0o700);
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

function tempDir() {
  const dir = mkdtempSync(path.join(tmpdir(), "buzzard-phase1-"));
  temps.push(dir);
  return dir;
}

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

function writeFixtureSet(dir, mutateName) {
  const hashes = {};
  for (const name of PROTECTED_FILES) {
    const body = Buffer.from(`synthetic-integrity-fixture:${name}\n`);
    const file = mutateName === name ? Buffer.concat([body, Buffer.from("x")]) : body;
    writeFileSync(path.join(dir, name), file);
    hashes[name] = sha256(mutateName === name ? body : file);
  }
  return hashes;
}

function writeBaseline(dir, hashes) {
  const files = {};
  for (const name of PROTECTED_FILES) files[name] = { sha256: hashes[name] };
  const baselinePath = path.join(dir, "baseline.json");
  writeFileSync(baselinePath, JSON.stringify({ files }));
  return baselinePath;
}

describe("phase 1 — core system and data integrity", () => {
  it("reaches 100% on software-completable checks", () => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    const report = evaluatePhase1CoreIntegrity();
    expect(report.percentComplete).toBe(100);
    expect(report.ok).toBe(true);
    expect(report.completeClaim).toBe(false);
    expect(report.live).toBe(false);
    expect(report.liveBlockers.map((item) => item.id)).toEqual(["LIVE_API_3001_SECURITY"]);
    expect(report.invariants.salesLocked).toBe(true);
    expect(report.invariants.egressDeny).toBe(true);
    expect(report.invariants.productionReady).toBe(false);
    expect(report.invariants.live).toBe(false);
    for (const check of report.checks) {
      expect(check.ok, check.id).toBe(true);
    }
    const data = report.checks.find((check) => check.id === "CORE_PROTECTED_DATA");
    expect(data.hashVerified).toBe(false);
    expect(data.files.map((file) => file.state)).toEqual(
      PROTECTED_FILES.map(() => DATA_STATES.ABSENT_IN_CLEAN_CHECKOUT)
    );
  });

  it("classifies a clean checkout as absent runtime data without creating files", () => {
    const data = checkProtectedDataIntegrity({ repoRoot: REPO });
    expect(data.ok).toBe(true);
    expect(data.hashVerified).toBe(false);
    expect(data.baselineState).toBe("VALID");
    expect(data.files.map((file) => file.name)).toEqual([...PROTECTED_FILES]);
    for (const file of data.files) {
      expect(file.state).toBe(DATA_STATES.ABSENT_IN_CLEAN_CHECKOUT);
      expect(file.ok).toBe(true);
      expect(file.hashVerified).toBe(false);
    }
    const leftBehind = readdirSync(path.join(REPO, "server/data")).filter((name) => PROTECTED_FILES.includes(name));
    expect(leftBehind).toEqual([]);
    for (const name of PROTECTED_FILES) {
      expect(existsSync(path.join(REPO, "server/data", name)), name).toBe(false);
    }
  });

  it("accepts an existing file only when its SHA-256 matches the baseline", () => {
    const dir = tempDir();
    const hashes = writeFixtureSet(dir);
    const data = checkProtectedDataIntegrity({
      repoRoot: REPO,
      dataDir: dir,
      baselinePath: writeBaseline(tempDir(), hashes),
    });
    expect(data.ok).toBe(true);
    expect(data.hashVerified).toBe(true);
    expect(data.files.every((file) => file.state === DATA_STATES.PRESENT_AND_MATCHED)).toBe(true);
  });

  it("rejects an existing file whose SHA-256 does not match the baseline", () => {
    const dir = tempDir();
    const hashes = writeFixtureSet(dir, "customers.json");
    const data = checkProtectedDataIntegrity({
      repoRoot: REPO,
      dataDir: dir,
      baselinePath: writeBaseline(tempDir(), hashes),
    });
    expect(data.ok).toBe(false);
    expect(data.hashVerified).toBe(false);
    const drifted = data.files.find((file) => file.name === "customers.json");
    expect(drifted.state).toBe(DATA_STATES.PRESENT_AND_HASH_MISMATCH);
    expect(drifted.actual).not.toBe(drifted.expected);
    expect(data.files.filter((file) => file.name !== "customers.json").every((file) => file.state === DATA_STATES.PRESENT_AND_MATCHED)).toBe(true);
  });

  it("rejects an unreadable protected file", () => {
    const dir = tempDir();
    const hashes = writeFixtureSet(dir);
    const blocked = path.join(dir, "security-log.json");
    chmodSync(blocked, 0o000);
    try {
      const data = checkProtectedDataIntegrity({
        repoRoot: REPO,
        dataDir: dir,
        baselinePath: writeBaseline(tempDir(), hashes),
      });
      expect(data.ok).toBe(false);
      expect(data.files.find((file) => file.name === "security-log.json").state).toBe(DATA_STATES.UNREADABLE);
    } finally {
      chmodSync(blocked, 0o600);
    }
  });

  it("rejects an invalid baseline manifest", () => {
    const dir = tempDir();
    const cases = [
      path.join(dir, "missing.json"),
      path.join(dir, "broken.json"),
      path.join(dir, "empty-files.json"),
      path.join(dir, "bad-sha.json"),
    ];
    writeFileSync(cases[1], "{");
    writeFileSync(cases[2], JSON.stringify({ files: {} }));
    writeFileSync(cases[3], JSON.stringify({
      files: Object.fromEntries(PROTECTED_FILES.map((name) => [name, { sha256: "abcd" }])),
    }));
    for (const baselinePath of cases) {
      const data = checkProtectedDataIntegrity({
        repoRoot: REPO,
        dataDir: tempDir(),
        baselinePath,
      });
      expect(data.ok, baselinePath).toBe(false);
      expect(data.baselineState, baselinePath).toBe(DATA_STATES.INVALID_BASELINE);
      expect(data.hashVerified, baselinePath).toBe(false);
      expect(data.files.every((file) => file.state === DATA_STATES.INVALID_BASELINE), baselinePath).toBe(true);
    }
  });

  it("does not treat an unexplained missing file as safe", () => {
    const dir = tempDir();
    const hashes = writeFixtureSet(dir);
    rmSync(path.join(dir, "buzzard.db"));
    const data = checkProtectedDataIntegrity({
      repoRoot: REPO,
      dataDir: dir,
      baselinePath: writeBaseline(tempDir(), hashes),
    });
    expect(data.ok).toBe(false);
    expect(data.hashVerified).toBe(false);
    expect(data.files.find((file) => file.name === "buzzard.db").state).toBe(DATA_STATES.UNEXPECTEDLY_MISSING);
  });
});
