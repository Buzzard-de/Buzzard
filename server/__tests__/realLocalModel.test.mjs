import { createRequire } from "node:module";
import { mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { createOrchestrator } = require("../lib/pusat/orchestrator.js");
const { consultReasoning } = require("../lib/buzzardNative/thinking/modelGate.js");
const { MODEL, inferLanguage, installLocalLanguageModel } = require("../lib/buzzardNative/thinking/localLanguageModel.js");

const MODEL_FILE = "/tmp/buzzard-local-ai/qwen2.5-1.5b-instruct-q4_k_m.gguf";
const LLAMA_BIN = "/tmp/buzzard-local-ai/llama-b12755/llama-cli";

function orchDb() {
  return path.join(mkdtempSync(path.join(os.tmpdir(), "buzzard-real-model-")), "orch.sqlite");
}

describe("real local language model", () => {
  it("keeps an already verified weight file and does not download it again", () => {
    const installed = installLocalLanguageModel({
      destDir: "/tmp/buzzard-local-ai",
      binDir: "/tmp/buzzard-local-ai/llama-b12755",
    });
    expect(installed).toMatchObject({
      ok: true,
      downloaded: false,
      paid: false,
      license: "Apache-2.0",
      sha256: MODEL.sha256,
      model: "Qwen2.5-1.5B-Instruct",
      file: MODEL_FILE,
    });
  });

  it("loads the local model, checks health, and answers English, German, and Turkish", () => {
    const health = inferLanguage({
      modelFile: MODEL_FILE,
      bin: LLAMA_BIN,
      prompt: "Reply with the single word OK.",
    });
    expect(health).toMatchObject({
      ok: true,
      code: "LOCAL_MODEL",
      paid: false,
      device: "cpu",
      gpuLayers: 0,
      actionsExecuted: false,
      mayStartAction: false,
      generalPurpose: false,
      model: "Qwen2.5-1.5B-Instruct",
      license: "Apache-2.0",
    });
    expect(health.answer).toMatch(/ok/i);
    expect(health.bytes).toBe(MODEL.bytes);

    const english = inferLanguage({
      modelFile: MODEL_FILE,
      bin: LLAMA_BIN,
      prompt: "What is the capital of France?",
    });
    const german = inferLanguage({
      modelFile: MODEL_FILE,
      bin: LLAMA_BIN,
      prompt: "Wie heißt die Hauptstadt von Deutschland?",
    });
    const turkish = inferLanguage({
      modelFile: MODEL_FILE,
      bin: LLAMA_BIN,
      prompt: "Türkiye'nin başkenti neresidir?",
    });
    expect(english).toMatchObject({ code: "LOCAL_MODEL", actionsExecuted: false });
    expect(german).toMatchObject({ code: "LOCAL_MODEL", actionsExecuted: false });
    expect(turkish).toMatchObject({ code: "LOCAL_MODEL", actionsExecuted: false });
    expect(english.answer).toMatch(/paris/i);
    expect(german.answer).toMatch(/berlin/i);
    expect(turkish.answer).toMatch(/ankara/i);
  }, 60000);

  it("records a validated Pusat answer and keeps rule tasks on the specialist engine", () => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    const orch = createOrchestrator({ dbPath: orchDb() });
    const denied = orch.handleRequest({
      text: "genel muhakeme: What is the capital of France?",
      requester: "banu_hanim",
      modelFile: MODEL_FILE,
      llamaBin: LLAMA_BIN,
    });
    expect(denied.code).toBe("PERMISSION_DENIED");
    const locked = orch.handleRequest({
      text: "genel muhakeme: satışı aç",
      modelFile: MODEL_FILE,
      llamaBin: LLAMA_BIN,
    });
    expect(locked).toMatchObject({ code: "SALES_LOCKED", purchased: false, salesEnabled: false });
    const price = orch.handleRequest({
      text: "fiyat hesapla",
      idempotencyKey: "real-price",
      modelFile: MODEL_FILE,
      llamaBin: LLAMA_BIN,
    });
    expect(price.specialists[0]).toMatchObject({
      agentId: "pricing_ai",
      execution: "RULE_BASED",
      llmCompleted: false,
      lifecycle: "COMPLETED",
    });
    const ran = orch.handleRequest({
      text: "genel muhakeme: What is the capital of France?",
      requester: "suleyman_bey",
      idempotencyKey: "real-en",
      modelFile: MODEL_FILE,
      llamaBin: LLAMA_BIN,
    });
    expect(ran).toMatchObject({
      ok: true,
      code: "LOCAL_MODEL",
      execution: "LOCAL_MODEL",
      basis: "LOCAL_MODEL",
      actionsExecuted: false,
      purchased: false,
      salesEnabled: false,
      saas: false,
      llmCompleted: false,
      lifecycle: "COMPLETED",
      pusatDidSpecialistWork: false,
    });
    expect(ran.answer).toMatch(/paris/i);
    const stored = orch.queue.get(ran.taskId);
    expect(stored.state).toBe("COMPLETED");
    expect(stored.payload).toMatchObject({
      answer: ran.answer,
      execution: "LOCAL_MODEL",
      actionsExecuted: false,
      verified: true,
    });
    orch.close();
  }, 30000);

  it("reports a missing model and a broken runner without claiming LOCAL_MODEL", () => {
    const missing = consultReasoning({ file: "/tmp/buzzard-local-ai/missing.gguf", prompt: "What is the capital of France?" });
    expect(missing).toMatchObject({ ok: false, code: "MODEL_NOT_CONFIGURED", answer: null, filePresent: false });
    const fake = path.join(mkdtempSync(path.join(os.tmpdir(), "buzzard-bad-gguf-")), "bad.gguf");
    writeFileSync(fake, "not a model");
    const broken = inferLanguage({ modelFile: fake, bin: LLAMA_BIN, prompt: "What is the capital of France?" });
    expect(broken.ok).toBe(false);
    expect(broken.code).not.toBe("LOCAL_MODEL");
    expect(broken.answer).toBeNull();
    const noRunner = inferLanguage({
      modelFile: MODEL_FILE,
      bin: "/tmp/buzzard-local-ai/missing-llama",
      prompt: "What is the capital of France?",
    });
    expect(noRunner).toMatchObject({ ok: false, code: "MODEL_UNAVAILABLE", answer: null });
    const orch = createOrchestrator({ dbPath: orchDb() });
    const queued = orch.handleRequest({
      text: "genel muhakeme: What is the capital of France?",
      modelFile: "/tmp/buzzard-local-ai/missing.gguf",
      llamaBin: LLAMA_BIN,
    });
    expect(queued).toMatchObject({
      ok: false,
      code: "MODEL_NOT_CONFIGURED",
      answer: null,
      lifecycle: "FAILED",
    });
    expect(queued.execution).not.toBe("LOCAL_MODEL");
    expect(orch.queue.get(queued.taskId).payload.answer).toBeNull();
    orch.close();
  });
});
