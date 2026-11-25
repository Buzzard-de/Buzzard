/**
 * Buzzard voice, phone, and realtime audio.
 * No Twilio, OpenAI, or other hosted speech service is required.
 */
const { VOICE_ID, analyzeOfficialVoice } = require("../buzzardNative/speech/voiceIdentity");
const { g2p } = require("../buzzardNative/speech/nativeTts");
const { ids } = require("../buzzardNative/core/identityRegistry");
const { canUse } = require("../buzzardNative/core/capabilityRegistry");
const { alignToAudio } = require("../buzzardNative/motion/visemeSchedule");
const { isSalesEnabled } = require("../salesMode");
const { profileFor, synthesizeStaff, transcribeStaff } = require("./staffMedia");

const LEXICON = Object.freeze([
  { text: "fiyat", lang: "tr", domain: "price", agentId: "pricing_ai" },
  { text: "stok", lang: "tr", domain: "stock", agentId: "stock_ai" },
  { text: "güvenlik", lang: "tr", domain: "security", agentId: "esat_bey" },
  { text: "rapor", lang: "tr", domain: "coordination", agentId: "pusat" },
  { text: "preis", lang: "de", domain: "price", agentId: "pricing_ai" },
  { text: "lager", lang: "de", domain: "stock", agentId: "stock_ai" },
  { text: "sicherheit", lang: "de", domain: "security", agentId: "esat_bey" },
  { text: "bericht", lang: "de", domain: "coordination", agentId: "pusat" },
  { text: "price", lang: "en", domain: "price", agentId: "pricing_ai" },
  { text: "stock", lang: "en", domain: "stock", agentId: "stock_ai" },
  { text: "security", lang: "en", domain: "security", agentId: "esat_bey" },
  { text: "report", lang: "en", domain: "coordination", agentId: "pusat" },
]);

function phonesOf(text, lang) {
  return g2p(text, lang).phonemes.filter(Boolean);
}

function matchLexicon(phonemes, lang) {
  const got = phonemes.join("|");
  return LEXICON.find((entry) => entry.lang === lang && phonesOf(entry.text, lang).join("|") === got) || null;
}

function createAudioEngine() {
  return {
    id: "buzzard_audio",
    inspect(wav) {
      const buf = Buffer.isBuffer(wav) ? wav : Buffer.alloc(0);
      if (buf.slice(0, 4).toString("ascii") !== "RIFF" || buf.length < 44) {
        return { ok: false, code: "AUDIO_REQUIRED", saas: false };
      }
      const rate = buf.readUInt32LE(24);
      const pcm = buf.readUInt32LE(40);
      let peak = 0;
      for (let i = 44; i < buf.length; i += 1) peak = Math.max(peak, Math.abs(buf[i] - 128));
      return { ok: rate === 8000 && pcm > 0 && peak > 0, rate, pcmBytes: pcm, peak, saas: false };
    },
  };
}

function createTtsEngine() {
  return {
    id: "buzzard_tts",
    speak(input) {
      const spoken = synthesizeStaff(input);
      if (!spoken.ok) return { ...spoken, engine: "buzzard_tts", saas: false };
      const audio = createAudioEngine().inspect(spoken.wav);
      const mouth = alignToAudio(spoken.phonemes, spoken.wav);
      return { ...spoken, engine: "buzzard_tts", audioQuality: audio, mouth, saas: false, hostedProvider: null };
    },
  };
}

function createSttEngine() {
  const audio = createAudioEngine();
  return {
    id: "buzzard_stt",
    recognize({ audio: wav, lang = "tr", timeoutMs = 1000, file = null } = {}) {
      const started = process.hrtime.bigint();
      const heard = transcribeStaff({ audio: wav, lang, timeoutMs, file });
      if (!heard.ok) return { ...heard, transcript: null, engine: "buzzard_stt", saas: false, orthographyRecovered: false };
      const media = file ? null : audio.inspect(wav);
      if (!file && !media.ok) return { ok: false, code: "AUDIO_REQUIRED", transcript: null, engine: "buzzard_stt", saas: false };
      const hit = matchLexicon(heard.phonemes, lang);
      const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
      if (!hit) {
        return {
          ok: false,
          code: "UNRECOGNIZED_SPEECH",
          transcript: null,
          phonemes: heard.phonemes,
          orthographyRecovered: false,
          elapsedMs,
          engine: "buzzard_stt",
          generalStt: false,
          saas: false,
        };
      }
      return {
        ok: true,
        code: "RECOGNIZED",
        transcript: hit.text,
        lang,
        domain: hit.domain,
        agentId: hit.agentId,
        phonemes: heard.phonemes,
        orthographyRecovered: true,
        elapsedMs,
        engine: "buzzard_stt",
        generalStt: false,
        saas: false,
      };
    },
  };
}

function createVoiceIdentityEngine() {
  return {
    id: "buzzard_voice_identity",
    list() {
      const reference = analyzeOfficialVoice({ actorId: "sinan_bey" });
      return ids().map((id) => {
        const profile = profileFor(id);
        const official = id === "sinan_bey";
        return {
          agentId: id,
          voiceId: profile.voiceId,
          speech: canUse(id, "speech"),
          officialReference: official,
          referenceHash: official ? reference.profile?.referenceFileHash || null : null,
          cloneAuthorized: false,
          hostedProvider: null,
        };
      });
    },
  };
}

function createRealtimeEngine() {
  const stt = createSttEngine();
  const tts = createTtsEngine();
  return {
    id: "buzzard_realtime",
    open({ agentId = "pusat", lang = "tr" } = {}) {
      return { id: `rt_${agentId}_${lang}`, agentId, lang, frames: [], state: "open", saas: false };
    },
    push(session, frame) {
      if (!session || session.state !== "open") return { ok: false, code: "SESSION_CLOSED", saas: false };
      if (!Buffer.isBuffer(frame) || frame.length === 0) return { ok: false, code: "EMPTY_FRAME", saas: false };
      session.frames.push(Buffer.from(frame));
      return { ok: true, queued: session.frames.length, saas: false };
    },
    finish(session) {
      if (!session || session.state === "closed") return { ok: false, code: "SESSION_CLOSED", saas: false };
      const wav = Buffer.concat(session.frames);
      const heard = stt.recognize({ audio: wav, lang: session.lang });
      const reply = heard.ok ? tts.speak({ agentId: "zeynep_hanim", text: "rapor", lang: "tr" }) : null;
      session.state = "closed";
      return {
        ok: heard.ok === true,
        code: heard.code,
        transcript: heard.transcript || null,
        reply,
        latencyMs: heard.elapsedMs,
        bytes: wav.length,
        saas: false,
        network: false,
      };
    },
    reconnect(session) {
      if (!session) return { ok: false, code: "SESSION_UNKNOWN" };
      session.state = "open";
      return { ok: true, id: session.id, state: session.state, saas: false };
    },
  };
}

function createPhoneEngine() {
  const stt = createSttEngine();
  const tts = createTtsEngine();
  const calls = [];
  return {
    id: "buzzard_phone",
    carrier: "buzzard",
    externalSaas: false,
    receive({ audio, lang = "tr", dbPath = null } = {}) {
      if (!Buffer.isBuffer(audio) || audio.length === 0) {
        return { ok: false, code: "CALL_AUDIO_MISSING", state: "failed", externalSaas: false };
      }
      const heard = stt.recognize({ audio, lang });
      if (!heard.ok) return { ...heard, state: "failed", externalSaas: false };
      let task = null;
      if (dbPath && heard.domain !== "coordination") {
        const { createOrchestrator } = require("../pusat/orchestrator");
        const orch = createOrchestrator({ dbPath });
        task = orch.routeStaff({ domain: heard.domain });
        orch.close();
      }
      const reply = tts.speak({ agentId: "zeynep_hanim", text: "rapor", lang: "tr" });
      const row = {
        id: `call_${calls.length + 1}`,
        state: "completed",
        transcript: heard.transcript,
        routedTo: heard.agentId,
        domain: heard.domain,
        coordinator: "pusat",
        replyBytes: reply.bytes,
        mouth: reply.mouth,
        taskCompleted: task ? task.merged.completed : 0,
        carrier: "buzzard",
        externalSaas: false,
        salesEnabled: isSalesEnabled(),
      };
      calls.push(row);
      return { ok: true, ...row, reply };
    },
    place({ extension, text = "rapor", lang = "tr" } = {}) {
      if (!extension) return { ok: false, code: "DESTINATION_REQUIRED", placedOnCarrier: false, externalSaas: false };
      const spoken = tts.speak({ agentId: "zeynep_hanim", text, lang });
      if (!spoken.ok) return { ...spoken, placedOnCarrier: false, externalSaas: false };
      const row = { id: `call_${calls.length + 1}`, state: "completed", extension: "present", bytes: spoken.bytes, placedOnCarrier: false, carrier: "buzzard", externalSaas: false };
      calls.push(row);
      return { ok: true, ...row, wav: spoken.wav };
    },
    report() {
      return calls.map((row) => ({ id: row.id, state: row.state, transcript: row.transcript || null }));
    },
  };
}

function createSpeechSession() {
  const stt = createSttEngine();
  const tts = createTtsEngine();
  const identity = createVoiceIdentityEngine();
  const realtime = createRealtimeEngine();
  return {
    id: "buzzard_speech_session",
    engines: ["buzzard_stt", "buzzard_tts", "buzzard_audio", "buzzard_voice_identity", "buzzard_realtime", "buzzard_phone"],
    requiredSaas: [],
    meeting({ topic = "kurmay" } = {}) {
      const roster = identity.list();
      const turns = [{ speaker: "pusat", text: topic, audio: false }];
      for (const member of roster) {
        if (!member.speech || member.agentId === "pusat") continue;
        const spoken = tts.speak({ agentId: member.agentId, text: "rapor", lang: "tr" });
        const heard = stt.recognize({ audio: spoken.wav, lang: "tr" });
        turns.push({
          speaker: member.agentId,
          voiceId: member.voiceId,
          officialReference: member.officialReference,
          transcript: heard.transcript,
          bytes: spoken.bytes,
          lipSync: spoken.mouth.lipSync === true,
          mesh: spoken.mouth.mesh,
        });
      }
      return {
        ok: roster.length === 17,
        chair: "pusat",
        members: roster.length,
        turns,
        minutes: turns.map((turn) => `${turn.speaker}: ${turn.transcript || turn.text}`).join("\n"),
        saas: false,
        salesEnabled: isSalesEnabled(),
      };
    },
    command({ audio, lang = "tr", dbPath } = {}) {
      const session = realtime.open({ agentId: "pusat", lang });
      const frames = [];
      for (let i = 0; i < audio.length; i += 160) frames.push(audio.subarray(i, Math.min(audio.length, i + 160)));
      for (const frame of frames) realtime.push(session, frame);
      const done = realtime.finish(session);
      const phone = createPhoneEngine();
      const call = phone.receive({ audio, lang, dbPath });
      return { realtime: done, call, saas: false };
    },
  };
}

module.exports = {
  LEXICON,
  createAudioEngine,
  createTtsEngine,
  createSttEngine,
  createVoiceIdentityEngine,
  createRealtimeEngine,
  createPhoneEngine,
  createSpeechSession,
};
