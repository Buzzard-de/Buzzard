const { COMPATIBILITY_STATES, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } = require("./constants");
const { normalizePartNumber } = require("./identifiers");
const { listParts } = require("./parts");
const { listMachines } = require("./machines");
const { evaluateCompatibility } = require("./compatibility");

function tokenize(value) {
  return String(value || "")
    .toLowerCase()
    .split(/[^a-z0-9äöüß]+/i)
    .filter((token) => token.length > 1);
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

function partHaystack(part) {
  return [
    part.oemPartNumber,
    part.oemNormalized,
    part.manufacturerPartNumber,
    part.supplierPartNumber,
    part.aftermarketPartNumber,
    ...part.previousPartNumbers,
    ...Object.values(part.descriptions || {}),
    part.manufacturer,
    part.categoryId,
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
  const normalizedQuery = q ? normalizePartNumber(q, query.manufacturer || part.manufacturer) : null;

  const numberFields = [
    ["exact_oem", part.oemPartNumber, part.oemNormalized, 1000],
    ["manufacturer", part.manufacturerPartNumber, null, 850],
    ["supplier", part.supplierPartNumber, null, 800],
    ["aftermarket", part.aftermarketPartNumber, null, 500],
  ];

  if (normalizedQuery?.valid) {
    for (const [kind, original, normalized, points] of numberFields) {
      const candidate = normalizePartNumber(original || normalized, part.manufacturer);
      if (candidate.valid && candidate.normalized === normalizedQuery.normalized) {
        score += points;
        matchKind = kind === "exact_oem" ? "exact_oem" : kind;
        reasons.push(kind);
        break;
      }
      if (candidate.valid && candidate.normalized.startsWith(normalizedQuery.normalized)) {
        score += Math.floor(points * 0.6);
        reasons.push(`${kind}_prefix`);
      }
    }
    for (const previous of part.previousPartNumbers) {
      const candidate = normalizePartNumber(previous, part.manufacturer);
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

  const tokens = tokenize(q);
  const hay = partHaystack(part);
  if (tokens.length) {
    const hits = tokens.filter((token) => hay.includes(token)).length;
    score += hits * 15;
    if (hits) reasons.push("keyword");
  }

  if (query.categoryId && part.categoryId === query.categoryId) {
    score += 25;
    reasons.push("category");
  }
  if (query.position && part.attributes?.position === query.position) {
    score += 40;
    reasons.push("position");
  }

  let compatibility = null;
  if (query.machineId || query.modelCode || query.modelName) {
    compatibility = evaluateCompatibility(store, {
      partId: part.id,
      machineId: query.machineId,
      manufacturer: query.manufacturer,
      modelCode: query.modelCode,
      modelName: query.modelName,
      year: query.year,
      serialNumber: query.serialNumber,
      position: query.position,
    });
    if (compatibility.state === COMPATIBILITY_STATES.VERIFIED_COMPATIBLE) score += 200;
    else if (compatibility.state === COMPATIBILITY_STATES.CONDITIONALLY_COMPATIBLE) score += 80;
    else if (compatibility.state === COMPATIBILITY_STATES.POSSIBLE_ALTERNATIVE) score += 10;
    else if (compatibility.state === COMPATIBILITY_STATES.VERIFIED_INCOMPATIBLE) score -= 500;
    reasons.push(`compat:${compatibility.state}`);
  }

  if (matchKind !== "exact_oem" && compatibility?.state === COMPATIBILITY_STATES.POSSIBLE_ALTERNATIVE) {
    matchKind = "possible_alternative";
  }

  return { score, matchKind, reasons, compatibility };
}

function search(store, query = {}, taxonomy) {
  const started = Date.now();
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(query.pageSize) || DEFAULT_PAGE_SIZE));

  const machineHits = listMachines(store).filter((machine) => {
    if (query.machineId) return machine.id === query.machineId;
    if (!query.q && !query.modelCode && !query.serialNumber) return false;
    const blob = `${machine.manufacturer} ${machine.modelName} ${machine.modelCode} ${machine.serialNumber || ""}`.toLowerCase();
    const needles = [query.q, query.modelCode, query.serialNumber, query.manufacturer].filter(Boolean);
    return needles.every((needle) => blob.includes(String(needle).toLowerCase()));
  });

  const scored = listParts(store)
    .map((part) => {
      const meta = scorePart(part, query, store);
      return { part, ...meta };
    })
    .filter((row) => {
      if (query.verifiedOnly) {
        return row.compatibility?.state === COMPATIBILITY_STATES.VERIFIED_COMPATIBLE;
      }
      if (query.q || query.oem || query.partNumber || query.machineId || query.modelCode) {
        return row.score > 0;
      }
      return true;
    })
    .sort((a, b) => {
      const rank = {
        exact_oem: 0,
        manufacturer: 1,
        supplier: 2,
        previous_number: 3,
        aftermarket: 4,
        fuzzy: 5,
        possible_alternative: 6,
        text: 7,
      };
      const ra = rank[a.matchKind] ?? 9;
      const rb = rank[b.matchKind] ?? 9;
      if (ra !== rb) return ra - rb;
      return b.score - a.score;
    });

  const start = (page - 1) * pageSize;
  const items = scored.slice(start, start + pageSize).map((row) => ({
    id: row.part.id,
    manufacturer: row.part.manufacturer,
    oemPartNumber: row.part.oemPartNumber,
    descriptions: row.part.descriptions,
    matchKind: row.matchKind,
    score: row.score,
    reasons: row.reasons,
    compatibility: row.compatibility
      ? { state: row.compatibility.state, missingInformation: row.compatibility.missingInformation }
      : null,
    provenance: {
      providerId: row.part.provenance.providerId,
      mock: row.part.provenance.mock,
      updatedAt: row.part.updatedAt,
    },
    freshnessAt: row.part.provenance.freshnessAt,
    verifiedExactMatch:
      row.matchKind === "exact_oem" &&
      (!row.compatibility || row.compatibility.state === COMPATIBILITY_STATES.VERIFIED_COMPATIBLE),
  }));

  return {
    items,
    machines: machineHits.slice(0, 10).map((machine) => ({
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
    rankingNote: "Exact OEM/manufacturer numbers outrank text and possible alternatives.",
  };
}

module.exports = { search, scorePart, tokenize, levenshtein };
