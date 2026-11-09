const STREAMS = Object.freeze([
  { id: 1, name: "Textile AI", owner: "category_ai", code: "PARTIAL", live: false },
  { id: 2, name: "AB-27 logistics", owner: "tuncay_bey", code: "PARTIAL", live: false },
  { id: 3, name: "Sanctions", owner: "tuncay_bey", code: "PARTIAL", live: false },
  { id: 4, name: "Privacy legal", owner: "esat_bey", code: "PARTIAL", live: false },
  { id: 5, name: "Tax pools", owner: "nedim_bey", code: "PARTIAL", live: false },
  { id: 6, name: "National days", owner: "pusat", code: "PARTIAL", live: false },
  { id: 7, name: "Tax Connect", owner: "nedim_bey", code: "CODE_PRESENT", live: false },
  { id: 8, name: "Doğu research", owner: "dogu_bey", code: "PARTIAL", live: false },
  { id: 9, name: "Phone voice", owner: "zeynep_hanim", code: "BLOCKED", live: false },
  { id: 10, name: "Secure messaging", owner: "esat_bey", code: "PARTIAL", live: false },
  { id: 11, name: "Device security", owner: "esat_bey", code: "PARTIAL", live: false },
  { id: 12, name: "Acceptance", owner: "sinan_bey", code: "PARTIAL", live: false },
  { id: 13, name: "Independent AI", owner: "sinan_bey", code: "PARTIAL", live: false },
  { id: 14, name: "Dev automation", owner: "sinan_bey", code: "PARTIAL", live: false },
  { id: 15, name: "Egress privacy", owner: "esat_bey", code: "PARTIAL", live: false },
  { id: 16, name: "Business continuity", owner: "esat_bey", code: "PARTIAL", live: false },
]);

function snapshot() {
  return { streams: STREAMS.map((s) => ({ ...s, productionReady: false })), anyLive: false };
}

module.exports = { STREAMS, snapshot };
