const { createEngine, notImplemented } = require("../engineContract");
const { validateAudio, languageHint } = require("../hearing/audioValidate");

function rms(samples) {
  if (!samples.length) return 0;
  const sum = samples.reduce((a, b) => a + b * b, 0);
  return Math.sqrt(sum / samples.length);
}

function parsePcm16(buffer) {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || []);
  const samples = [];
  for (let i = 0; i + 1 < buf.length; i += 2) samples.push(buf.readInt16LE(i) / 32768);
  return samples;
}

function createHearingEngine() {
  const buffers = [];
  return createEngine({
    id: "hearing",
    capabilities: ["buffer", "energy_vad", "languages_plan"],
    executeImpl(input) {
      const op = input.op || "buffer";
      if (op === "buffer") {
        const pcm = parsePcm16(input.pcm || []);
        buffers.push({ at: Date.now(), n: pcm.length });
        return { op, buffered: pcm.length, retained: false };
      }
      if (op === "vad") {
        const energy = rms(parsePcm16(input.pcm || []));
        return { op, energy, voiceLikely: energy > 0.02, stt: false, languages: ["tr", "de"], expansion: ["en"] };
      }
      if (op === "dataset") {
        return { op, speechHours: 0, license: "none", tr: 0, de: 0, note: "collect_later_with_consent", liveStt: false };
      }
      if (op === "validate") return { op, ...validateAudio(input.pcm || input.bytes), liveStt: false };
      if (op === "language") return { op, hint: languageHint(input.text), stt: false };
      if (op === "transcribe") return { ...notImplemented("transcribe"), liveStt: false, vadIsNotStt: true };
      return notImplemented(op);
    },
  });
}

module.exports = { createHearingEngine, rms, parsePcm16 };
