const { synthesizeSafe } = require("./ttsArchitecture");
const { g2p } = require("./nativeTts");

function benchLang(lang, text) {
  const t0 = process.hrtime.bigint();
  const out = synthesizeSafe({ text, lang });
  const ns = Number(process.hrtime.bigint() - t0);
  return {
    lang,
    ok: out.ok,
    officialVoiceUsed: out.officialVoiceUsed,
    cloneAuthorized: false,
    wavBytes: out.bytes,
    latencyMs: ns / 1e6,
    sampleRate: 8000,
    phonemes: g2p(text, lang).phonemes.length,
    kind: out.kind,
  };
}

function benchAll() {
  const rows = [
    benchLang("tr", "merhaba dünya"),
    benchLang("de", "guten tag"),
    benchLang("en", "hello world"),
  ];
  return {
    rows,
    meanLatencyMs: rows.reduce((a, r) => a + r.latencyMs, 0) / rows.length,
    officialVoiceUsed: false,
    realHumanTts: false,
  };
}

module.exports = { benchLang, benchAll };
