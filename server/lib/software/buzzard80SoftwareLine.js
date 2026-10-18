/**
 * 80-item A–I table: software-line scoring (established-scope), not live-capped 80-class.
 * Live-capped ~68.2% stays a different method (LIVE tavan 0, CODE_READY ~72).
 * This module reads the 237 register; it does not open sales/SoT/payments.
 */

const fs = require("fs");
const path = require("path");

const REGISTER = path.join(
  __dirname,
  "../../../docs/software-completion/BUZZARD_237_MASTER_EXECUTION_REGISTER.md"
);

const SECTIONS = Object.freeze([
  { id: "A", name: "Merkezi mimari ve güvenlik", ids: [1, 2, 3, 4, 5, 8, 11, 12, 168, 227] },
  { id: "B", name: "Ürün ve katalog", ids: [56, 57, 58, 59, 62, 67, 70, 71, 73, 74] },
  { id: "C", name: "Tedarikçi ve stok", ids: [75, 77, 79, 80, 81, 83, 84, 86, 87, 88] },
  { id: "D", name: "Fiyatlandırma ve kârlılık", ids: [22, 23, 27, 76, 89, 90, 91, 104] },
  { id: "E", name: "Sipariş, ödeme ve iade", ids: [95, 96, 97, 101, 102, 108, 109, 110, 112, 113] },
  { id: "F", name: "Pazaryeri ve uluslararası", ids: [114, 115, 116, 117, 118, 121, 129, 131, 135, 144] },
  { id: "G", name: "Lojistik ve müşteri", ids: [152, 154, 155, 156, 157, 163, 165, 166] },
  { id: "H", name: "Yapay zekâ asistanları", ids: [35, 41, 47, 52, 54, 55, 178, 182] },
  { id: "I", name: "Test ve işletim", ids: [196, 199, 202, 203, 204, 210] },
]);

const HUMAN_IN_80 = Object.freeze([67, 73, 115, 129, 155, 165, 182]);
const EXTERNAL_IN_80 = Object.freeze([87, 88]);

function parseRegisterPercents(text) {
  const map = {};
  const parts = text.split(/\n### Item /);
  for (const part of parts.slice(1)) {
    const n = Number(String(part).match(/^(\d+)/)?.[1]);
    const pct = Number(String(part).match(/Completion percentage \| ([0-9.]+)%/)?.[1]);
    if (Number.isFinite(n) && Number.isFinite(pct)) map[n] = pct;
  }
  return map;
}

function mean(values) {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function inspect() {
  const percents = parseRegisterPercents(fs.readFileSync(REGISTER, "utf8"));
  const sections = SECTIONS.map((section) => {
    const scores = section.ids.map((id) => percents[id]);
    if (scores.some((s) => s == null)) {
      throw new Error(`80 mapping missing register percent in ${section.id}`);
    }
    return {
      id: section.id,
      name: section.name,
      count: section.ids.length,
      softwareLineMean: Number(mean(scores).toFixed(1)),
      min: Math.min(...scores),
      liveVerified: false,
    };
  });
  const all = SECTIONS.flatMap((s) => s.ids).map((id) => percents[id]);
  return {
    ok: true,
    live: false,
    liveVerified: false,
    method: "software-line-established-scope",
    notLiveCapped68: true,
    itemCount: all.length,
    softwareLineMean: Number(mean(all).toFixed(1)),
    softwareLineExact: Number((all.reduce((a, b) => a + b, 0) / all.length).toFixed(4)),
    humanSoftwareComplete: HUMAN_IN_80.slice(),
    externalSoftwareComplete: EXTERNAL_IN_80.slice(),
    item202: percents[202],
    sections,
  };
}

module.exports = {
  SECTIONS,
  HUMAN_IN_80,
  EXTERNAL_IN_80,
  inspect,
};
