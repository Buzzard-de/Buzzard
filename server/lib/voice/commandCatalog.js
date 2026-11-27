/**
 * Turkish commands the orchestrator already classifies, plus the meeting lines.
 * A transcript is accepted only when it is the same command. Nothing is rewritten.
 */
const COMMANDS = Object.freeze([
  { text: "güvenlik durumu", domain: "security" },
  { text: "fiyat kontrol", domain: "price" },
  { text: "stok kontrol", domain: "stock" },
  { text: "rapor sun", domain: "coordination" },
  { text: "toplantıyı başlat", domain: "coordination" },
  { text: "vergi hesabı", domain: "tax" },
  { text: "gümrük kontrol", domain: "customs" },
  { text: "kategori araştır", domain: "research" },
  { text: "marka taslağı", domain: "brand" },
  { text: "kampanya analizi", domain: "campaign" },
  { text: "seo kaydı", domain: "seo" },
  { text: "müşteri durumu", domain: "customer" },
  { text: "satış analizi", domain: "sales" },
  { text: "telefon kaydı", domain: "phone" },
  { text: "yazılım durumu", domain: "software" },
  { text: "yayın taslağı", domain: "publish" },
]);

const GATES = Object.freeze([
  { text: "satın alma", code: "HUMAN_GATE_REQUIRED" },
  { text: "satışı aç", code: "SALES_LOCKED" },
]);

function foldCommand(value) {
  return String(value || "").trim().toLocaleLowerCase("tr-TR").replace(/[.?!]+$/g, "");
}

function acceptHeardCommand(transcript) {
  const heard = foldCommand(transcript);
  return COMMANDS.find((command) => foldCommand(command.text) === heard)?.text || null;
}

function heardGate(transcript) {
  const heard = foldCommand(transcript);
  return GATES.find((gate) => foldCommand(gate.text) === heard)?.code || null;
}

module.exports = { COMMANDS, GATES, foldCommand, acceptHeardCommand, heardGate };
