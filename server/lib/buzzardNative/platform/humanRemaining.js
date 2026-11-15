/**
 * Work only Süleyman Bey can do. Sinan Bey cannot execute these.
 */
const REMAINING = Object.freeze([
  {
    id: "GIT_PUSH",
    why: "Dalları origin'e göndermek insan onayı ister.",
    blockedTechnically: true,
  },
  {
    id: "MERGE",
    why: "Phase dallarını main'e birleştirmek insan onayı ister.",
    blockedTechnically: true,
  },
  {
    id: "DEPLOY",
    why: "Production yayın insan onayı ister.",
    blockedTechnically: true,
  },
  {
    id: "CLONE_OFFICIAL_VOICE",
    why: "cloneAuthorized false. Resmi ses klonu ayrı açık onay ister.",
    blockedTechnically: true,
  },
  {
    id: "LICENSE_SPEECH_TEXT_DATA",
    why: "İnsan STT/LLM için lisanslı TR/DE/EN veri. Satın alma yasak; sen seçersin.",
    blockedTechnically: true,
  },
  {
    id: "DOWNLOAD_OR_HOST_MODELS",
    why: "Egress DENY. Ağırlık/model indirme ayrı onay ister.",
    blockedTechnically: true,
  },
  {
    id: "GPU_OR_24_7_HOST",
    why: "Mevcut Xeon 4c / ~16 GiB / GPU yok. Satın alma 0 EUR politikasında yasak.",
    blockedTechnically: true,
  },
  {
    id: "OFFSITE_BACKUP",
    why: "3-2-1-1-0 offsite hedefi yok. Konum ve WORM senin kararın.",
    blockedTechnically: true,
  },
  {
    id: "LIVE_WEBRTC_MEDIA",
    why: "Ağ TURN/STUN ve canlı medya. Egress/onay gerekir.",
    blockedTechnically: true,
  },
  {
    id: "CHANGE_EGRESS_DENY",
    why: "Esat katmanı. Sinan gevşetemez.",
    blockedTechnically: true,
  },
  {
    id: "ENABLE_SALES_OR_PAYMENTS",
    why: "Satış/ödeme kapısı ayrı onay.",
    blockedTechnically: true,
  },
  {
    id: "ENABLE_LIVE_CARRIER",
    why: "PSTN/Twilio canlı taşıyıcı ayrı onay.",
    blockedTechnically: true,
  },
  {
    id: "PRODUCTION_RESTORE",
    why: "Üretim geri yükleme ayrı onay.",
    blockedTechnically: true,
  },
  {
    id: "DATA_DELETE",
    why: "Geri alınamaz silme ayrı onay.",
    blockedTechnically: true,
  },
  {
    id: "EXPORT_SECRETS",
    why: "Gizli anahtar dışarı aktarma yasak / onay.",
    blockedTechnically: true,
  },
  {
    id: "PURCHASE_ANYTHING",
    why: "Bütçe 0 EUR. Ödeme yapamam.",
    blockedTechnically: true,
  },
]);

function list() {
  return {
    owner: "suleyman_bey",
    agentCannotComplete: REMAINING,
    count: REMAINING.length,
    cloneAuthorized: false,
    budgetEur: 0,
    push: false,
  };
}

function isHumanOnly(id) {
  return REMAINING.some((r) => r.id === id);
}

module.exports = { REMAINING, list, isHumanOnly };
