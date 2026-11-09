/**
 * Legal / privacy helpers. AI must not claim to be human. Legal outcomes stay human.
 */
const REQUIRED_DISCLOSURE = "Ich bin eine Buzzard-KI, keine natürliche Person.";

function discloseIdentity({ locale = "de" } = {}) {
  if (locale === "en") return "I am a Buzzard AI, not a human.";
  if (locale === "tr") return "Ben bir Buzzard yapay zekâsıyım, gerçek bir kişi değilim.";
  if (locale === "ar") return "أنا ذكاء اصطناعي من Buzzard ولست إنساناً.";
  return REQUIRED_DISCLOSURE;
}

function reviewAutomatedDecision({ decisionType, impact = "low" } = {}) {
  const humanRequired = impact === "high" || decisionType === "legal" || decisionType === "credit";
  return {
    automated: !humanRequired,
    humanReviewRequired: humanRequired,
    canFinalize: !humanRequired,
    code: humanRequired ? "LEGAL_HUMAN_REQUIRED" : "AUTOMATED_ALLOWED",
  };
}

function cookieConsentRecord({ necessary = true, analytics = false, marketing = false, actorId } = {}) {
  return {
    necessary: Boolean(necessary),
    analytics: Boolean(analytics),
    marketing: Boolean(marketing),
    actorId: actorId || null,
    recordedAt: new Date().toISOString(),
    lawfulBasis: {
      necessary: "legitimate_interest_or_contract",
      analytics: analytics ? "consent" : "not_granted",
      marketing: marketing ? "consent" : "not_granted",
    },
  };
}

module.exports = {
  REQUIRED_DISCLOSURE,
  discloseIdentity,
  reviewAutomatedDecision,
  cookieConsentRecord,
};
