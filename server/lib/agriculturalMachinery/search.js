const { COMPATIBILITY_STATES } = require("./constants");
const kit = require("../machineryDomainKit");
const { listParts } = require("./parts");
const { listMachines } = require("./machines");
const { evaluateCompatibility } = require("./compatibility");

const SYNONYMS = {
  traktor: ["tractor", "schlepper"],
  tractor: ["traktor", "schlepper"],
  zapfwelle: ["pto", "gelenkwelle", "cardan"],
  pto: ["zapfwelle", "gelenkwelle"],
  düse: ["duese", "nozzle", "meme"],
  nozzle: ["düse", "duese"],
  filter: ["luftfilter", "hydraulikfilter", "filtre"],
  gelenkwelle: ["pto", "zapfwelle"],
};

function tokenize(value) {
  return String(value || "")
    .toLowerCase()
    .split(/[^a-z0-9äöüß]+/i)
    .filter((token) => token.length > 1);
}

function expandTokens(tokens) {
  const out = new Set(tokens);
  for (const token of tokens) {
    for (const extra of SYNONYMS[token] || []) out.add(extra);
  }
  return [...out];
}

function levenshtein(a, b) {
  const s = String(a);
  const t = String(b);
  if (Math.abs(s.length - t.length) > 2) return 99;
  const dp = Array.from({ length: s.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= t.length; j += 1) dp[0][j] = j;
  for (let i = 1; i <= s.length; i += 1) {
    for (let j = 1; j <= t.length; j += 1) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[s.length][t.length];
}

function haystack(part) {
  return [
    part.oemPartNumber,
    part.oemNormalized,
    part.manufacturerPartNumber,
    part.supplierPartNumber,
    part.aftermarketPartNumber,
    ...part.previousPartNumbers,
    ...part.approvedAlternativePartNumbers,
    ...Object.values(part.descriptions || {}),
    ...(part.synonyms || []),
    part.manufacturer,
    part.categoryId,
    part.thread,
    part.pto?.speed,
    part.attributes?.position,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function scorePart(part, query, store) {
  const reasons = [];
  let score = 0;
  let matchKind = "text";
  const q = String(query.q || query.oem || query.partNumber || "").trim();
  const normalizedQuery = q ? kit.identifiers.normalizePartNumber(q, query.manufacturer || part.manufacturer) : null;

  const numberFields = [
    ["exact_oem", part.oemPartNumber, 1000],
    ["manufacturer", part.manufacturerPartNumber, 850],
    ["supplier", part.supplierPartNumber, 800],
    ["aftermarket", part.aftermarketPartNumber, 500],
  ];
  if (normalizedQuery?.valid) {
    for (const [kind, original, points] of numberFields) {
      const candidate = kit.identifiers.normalizePartNumber(original, part.manufacturer);
      if (candidate.valid && candidate.normalized === normalizedQuery.normalized) {
        score += points;
        matchKind = kind;
        reasons.push(kind);
        break;
      }
    }
    for (const previous of [...part.previousPartNumbers, ...part.replacementPartNumbers]) {
      const candidate = kit.identifiers.normalizePartNumber(previous, part.manufacturer);
      if (candidate.valid && candidate.normalized === normalizedQuery.normalized) {
        score += 400;
        matchKind = matchKind === "exact_oem" ? matchKind : "previous_number";
        reasons.push("previous_number");
      }
    }
    if (score === 0 && normalizedQuery.normalized.length >= 5) {
      const distance = levenshtein(normalizedQuery.normalized, part.oemNormalized || "");
      if (distance > 0 && distance <= 2) {
        score += 120;
        matchKind = "fuzzy";
        reasons.push("typo_tolerance");
      }
    }
  }

  const tokens = expandTokens(tokenize(q));
  const hay = haystack(part);
  const hits = tokens.filter((token) => hay.includes(token)).length;
  if (hits) {
    score += hits * 15;
    reasons.push("keyword_or_synonym");
  }
  if (query.categoryId && part.categoryId === query.categoryId) {
    score += 25;
    reasons.push("category");
  }
  if (query.thread && part.thread && String(part.thread).toLowerCase() === String(query.thread).toLowerCase()) {
    score += 40;
    reasons.push("thread");
  }
  if (query.ptoSpeed && part.pto?.speed && String(part.pto.speed) === String(query.ptoSpeed)) {
    score += 40;
    reasons.push("pto");
  }

  let compatibility = null;
  if (query.machineId || query.modelCode || query.modelName) {
    compatibility = evaluateCompatibility(store, { ...query, partId: part.id });
    if (compatibility.state === COMPATIBILITY_STATES.VERIFIED_COMPATIBLE) score += 200;
    else if (compatibility.state === COMPATIBILITY_STATES.CONDITIONALLY_COMPATIBLE) score += 80;
    else if (compatibility.state === COMPATIBILITY_STATES.POSSIBLE_ALTERNATIVE) score += 10;
    else if (compatibility.state === COMPATIBILITY_STATES.VERIFIED_INCOMPATIBLE) score -= 500;
    reasons.push(`compat:${compatibility.state}`);
  }

  return { score, matchKind, reasons, compatibility };
}

function search(store, query = {}, taxonomy) {
  const started = Date.now();
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
  if (query.categoryId && String(query.categoryId).startsWith("cme-cat-")) {
    return { items: [], machines: [], total: 0, rejectedDomain: "construction", rankingNote: "isolated" };
  }

  const scored = listParts(store)
    .filter((part) => part.domain === "agricultural")
    .map((part) => ({ part, ...scorePart(part, query, store) }))
    .filter((row) => {
      if (query.q || query.oem || query.partNumber || query.machineId || query.modelCode) return row.score > 0;
      return true;
    })
    .sort((a, b) => {
      const rank = { exact_oem: 0, manufacturer: 1, supplier: 2, previous_number: 3, aftermarket: 4, fuzzy: 5, text: 6 };
      return (rank[a.matchKind] ?? 9) - (rank[b.matchKind] ?? 9) || b.score - a.score;
    });

  const machines = listMachines(store)
    .filter((machine) => {
      if (query.machineId) return machine.id === query.machineId;
      const blob = `${machine.manufacturer} ${machine.modelName} ${machine.modelCode || ""}`.toLowerCase();
      return [query.q, query.modelCode, query.manufacturer].filter(Boolean).every((needle) => blob.includes(String(needle).toLowerCase()));
    })
    .slice(0, 10);

  const start = (page - 1) * pageSize;
  return {
    domain: "agricultural",
    items: scored.slice(start, start + pageSize).map((row) => ({
      id: row.part.id,
      manufacturer: row.part.manufacturer,
      oemPartNumber: row.part.oemPartNumber,
      descriptions: row.part.descriptions,
      matchKind: row.matchKind,
      score: row.score,
      reasons: row.reasons,
      compatibility: row.compatibility
        ? { state: row.compatibility.state, missingInformation: row.compatibility.missingInformation, explanation: row.compatibility.explanation }
        : null,
      provenance: { providerId: row.part.provenance.providerId, mock: row.part.provenance.mock, updatedAt: row.part.updatedAt },
      verifiedExactMatch:
        row.matchKind === "exact_oem" &&
        (!row.compatibility || row.compatibility.state === COMPATIBILITY_STATES.VERIFIED_COMPATIBLE),
    })),
    machines: machines.map((machine) => ({
      id: machine.id,
      manufacturer: machine.manufacturer,
      modelName: machine.modelName,
      modelCode: machine.modelCode,
    })),
    page,
    pageSize,
    total: scored.length,
    latencyMs: Date.now() - started,
    taxonomyHint: query.q && taxonomy ? taxonomy.findByAlias(query.q).map((category) => category.id) : [],
    rankingNote: "Identifier quality and agricultural evidence outrank price.",
  };
}

module.exports = { search, expandTokens, tokenize, SYNONYMS };
