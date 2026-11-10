import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const shells = require("../lib/blockedAdapters/shells");

const inventory = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "..", "data", "banking", "eu27", "se-fi-register.json");

test("provider shells stay offline and keep the locked capability codes", () => {
  const tts = shells.officialTts({ text: "synthetic" });
  const stt = shells.humanStt({});
  const timedOut = shells.officialTts({ text: "synthetic", timeoutMs: 0 });
  assert.equal(tts.code, "PROVIDER_ABSENT");
  assert.equal(tts.officialTts, "NOT_IMPLEMENTED");
  assert.equal(tts.cloneAuthorized, false);
  assert.equal(tts.attempts, 2);
  assert.equal(tts.audioStored, false);
  assert.equal(tts.liveVerified, false);
  assert.equal(stt.transcribe, "NOT_IMPLEMENTED");
  assert.equal(stt.humanStt, false);
  assert.equal(timedOut.code, "TIMEOUT");
  assert.equal(shells.modelHealth().fallback, "RULE_REASONER");
  assert.equal(shells.modelHealth().weightsLoaded, false);
  assert.equal(shells.sceneFixture().understood, false);
  const lips = shells.lipSyncScene();
  assert.equal(lips.lipSync, "NOT_IMPLEMENTED");
  assert.equal(lips.alignedToAudio, true);
  assert.equal(lips.mediaAdapter.connected, false);
  assert.equal(shells.bodyScene().body3d, "NOT_IMPLEMENTED");
  assert.equal(shells.bodyScene().joints.length, 0);
});

test("backup, bank, tracking, and register import stay local", () => {
  const before = fs.statSync(inventory).mtimeMs;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-shell-"));
  const backup = shells.localBackupRoundtrip(dir);
  assert.equal(backup.intact, true);
  assert.equal(backup.restoredOk, true);
  assert.equal(backup.offsiteCopied, false);
  const bank = shells.sandboxBank({ currency: "BTC", assetType: "fiat" });
  assert.equal(bank.code, "REJECTED_CRYPTO_POLICY");
  assert.equal(bank.endpoint, null);
  const fiat = shells.sandboxBank();
  assert.equal(fiat.code, "HUMAN_GATE_REQUIRED");
  assert.equal(fiat.endpoint, null);
  assert.equal(fiat.moneyMoved, false);
  const track = shells.syntheticTrack();
  assert.equal(track.live, false);
  assert.equal(track.normalized, "IN_TRANSIT");
  assert.equal(track.events.at(-1).unmapped, true);
  const missing = shells.importQuotedRows([{ officialName: "Fixture", countryCode: "DE" }], { researchDate: "2026-11-10" });
  assert.equal(missing.code, "SOURCE_URL_REQUIRED");
  const imported = shells.importQuotedRows(
    [
      { officialName: "Synthetic Register Fixture", countryCode: "de", lei: "54930084UKLVMY22DS16" },
      { officialName: "Synthetic Register Fixture", countryCode: "DE", lei: "54930084UKLVMY22DS16" },
      { countryCode: "DE" },
    ],
    { sourceUrl: "https://example.invalid/register", researchDate: "2026-11-10" }
  );
  assert.equal(imported.persisted, false);
  assert.equal(imported.registryComplete, false);
  assert.equal(imported.imported, 1);
  assert.equal(imported.rows[0].ownershipClass, "UNKNOWN");
  assert.equal(imported.rows[0].endpoint, null);
  assert.equal(imported.rejected.some((row) => row.code === "DUPLICATE"), true);
  assert.equal(fs.statSync(inventory).mtimeMs, before);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("the eleven shells record software completion without a live claim", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-shell-run-"));
  const checkpoint = path.join(dir, "checkpoint.json");
  const report = shells.runShells({ backupDir: path.join(dir, "backup"), checkpointPath: checkpoint });
  assert.equal(report.cursorRunsContinuously, false);
  assert.equal(report.softwareCompleted, 11);
  assert.equal(report.autonomousSoftwareCompletion, 1);
  assert.equal(report.projectCompletionIncludingGates, 0.5);
  assert.equal(report.tasks.every((task) => task.liveVerified === false), true);
  assert.equal(report.tasks.filter((task) => task.externalStatus === "HUMAN_APPROVAL_REQUIRED").length, 4);
  assert.equal(report.tasks.filter((task) => task.externalStatus === "EXTERNAL_DEPENDENCY_BLOCKED").length, 7);
  fs.rmSync(dir, { recursive: true, force: true });
});
