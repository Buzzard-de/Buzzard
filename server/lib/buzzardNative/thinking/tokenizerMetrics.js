const { trainByteBpe, encode, roundtrip } = require("./tokenizer");

function sharedPrefix(a, b) {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i += 1;
  return i;
}

function measureTokenizer(texts) {
  const model = trainByteBpe(texts, 32);
  const samples = {
    trChars: "çğıöşüÇĞİÖŞÜ",
    deChars: "äöüßÄÖÜ",
    enPunct: "Hello, world! 123.",
    trSuffix: ["geliştirir", "geliştirmek"],
    deCompound: ["Trainingsset", "Training"],
    long: `${"Buzzard ".repeat(80)}çğıöşü äöüß.`,
    emoji: "ok ✓ 🧠",
  };
  const tr = roundtrip(samples.trChars, model);
  const de = roundtrip(samples.deChars, model);
  const en = roundtrip(samples.enPunct, model);
  const long = roundtrip(samples.long, model);
  const emo = roundtrip(samples.emoji, model);
  const suf = {
    a: encode(samples.trSuffix[0], model),
    b: encode(samples.trSuffix[1], model),
  };
  const cmp = {
    a: encode(samples.deCompound[0], model),
    b: encode(samples.deCompound[1], model),
  };
  return {
    downloaded: false,
    utf8Roundtrip: tr.ok && de.ok && en.ok && long.ok && emo.ok,
    tr,
    de,
    en,
    long,
    emoji: emo,
    unknownToken: "none_byte_level_encodes_all_utf8",
    trSuffixShared: sharedPrefix(suf.a, suf.b),
    trSuffixRatio: sharedPrefix(suf.a, suf.b) / Math.max(suf.a.length, 1),
    deCompoundShared: sharedPrefix(cmp.a, cmp.b),
    compressionTr: tr.compression,
    compressionDe: de.compression,
    compressionEn: en.compression,
    longTokens: long.tokens,
    vocabSize: model.vocabSize,
    model,
  };
}

module.exports = { measureTokenizer, sharedPrefix };
