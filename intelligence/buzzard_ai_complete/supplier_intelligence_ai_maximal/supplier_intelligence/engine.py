from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from enum import Enum
import re
from typing import Dict, List, Optional


class Decision(str, Enum):
    APPROVE = "APPROVE"
    CONDITIONAL = "CONDITIONAL"
    REVIEW = "REVIEW"
    REJECT = "REJECT"


@dataclass
class Evidence:
    source_type: str
    source: str
    claim: str
    observed_at: str
    reliability: float = 0.5
    notes: str = ""


@dataclass
class SupplierProfile:
    supplier_id: str
    legal_name: str
    country: Optional[str] = None
    website: Optional[str] = None
    vat_id: Optional[str] = None
    registry_id: Optional[str] = None
    address: Optional[str] = None
    categories: List[str] = field(default_factory=list)
    brands: List[str] = field(default_factory=list)
    capabilities: Dict[str, bool] = field(default_factory=dict)
    commercial_terms: Dict[str, object] = field(default_factory=dict)
    evidence: List[Evidence] = field(default_factory=list)


@dataclass
class RiskResult:
    score: float
    decision: Decision
    dimensions: Dict[str, float]
    red_flags: List[str]
    missing_evidence: List[str]
    reasons: List[str]


class SupplierIntelligenceEngine:
    WEIGHTS = {
        "identity": 0.18,
        "legal_verification": 0.14,
        "commercial_transparency": 0.12,
        "product_authenticity": 0.10,
        "delivery": 0.10,
        "stock_accuracy": 0.08,
        "returns_warranty": 0.08,
        "integration": 0.07,
        "reputation": 0.07,
        "financial_operational_risk": 0.06,
    }

    def __init__(self, minimum_evidence=2):
        self.minimum_evidence = minimum_evidence

    @staticmethod
    def clamp(value):
        return max(0.0, min(100.0, float(value)))

    def evidence_coverage(self, profile: SupplierProfile):
        by_type = {}
        for item in profile.evidence:
            by_type.setdefault(item.source_type, []).append(item)
        return by_type

    def validate_profile(self, profile: SupplierProfile):
        errors = []
        if not profile.supplier_id:
            errors.append("supplier_id missing")
        if not profile.legal_name:
            errors.append("legal_name missing")
        if profile.website and not re.match(r"^https?://", profile.website):
            errors.append("website must use http/https")
        if len(profile.evidence) < self.minimum_evidence:
            errors.append("insufficient evidence")
        return errors

    def score(self, profile: SupplierProfile, signals: Dict[str, float],
              red_flags=None, missing_evidence=None):
        red_flags = list(red_flags or [])
        missing = list(missing_evidence or [])
        dimensions = {}
        for key, weight in self.WEIGHTS.items():
            dimensions[key] = self.clamp(signals.get(key, 0.0))

        weighted = sum(dimensions[key] * weight for key, weight in self.WEIGHTS.items())
        coverage = len(profile.evidence)
        if coverage < self.minimum_evidence:
            weighted = min(weighted, 59.0)

        penalty = 0.0
        penalty += 25.0 if "identity_unverified" in red_flags else 0.0
        penalty += 20.0 if "suspected_fraud" in red_flags else 0.0
        penalty += 15.0 if "counterfeit_signal" in red_flags else 0.0
        penalty += 10.0 if "payment_anomaly" in red_flags else 0.0
        penalty += 8.0 if "delivery_reliability_issue" in red_flags else 0.0

        final = self.clamp(weighted - penalty)
        if "suspected_fraud" in red_flags or "identity_unverified" in red_flags:
            decision = Decision.REJECT if final < 45 else Decision.REVIEW
        elif final >= 85 and not missing:
            decision = Decision.APPROVE
        elif final >= 65:
            decision = Decision.CONDITIONAL
        else:
            decision = Decision.REVIEW

        reasons = []
        if coverage >= self.minimum_evidence:
            reasons.append("Yeterli sayıda izlenebilir açık kaynak kanıtı mevcut.")
        else:
            reasons.append("Kanıt kapsamı yetersiz; skor üst sınırı uygulandı.")
        if missing:
            reasons.append("Eksik kanıtlar tamamlanmadan tam onay önerilmez.")
        if red_flags:
            reasons.append("Risk sinyalleri skor üzerinde cezalandırıldı.")

        return RiskResult(final, decision, dimensions, red_flags, missing, reasons)

    def onboarding_checklist(self, profile: SupplierProfile):
        required = [
            "legal_identity",
            "tax_vat",
            "address",
            "bank/payment_name_match",
            "product_authenticity",
            "pricing_terms",
            "moq",
            "stock_feed",
            "shipping_terms",
            "returns_warranty",
            "dropshipping",
            "white_label",
            "api_xml_csv",
            "sla",
            "data_processing",
        ]
        present = set(profile.commercial_terms.keys())
        return {item: item in present for item in required}

    def compare(self, profiles: List[SupplierProfile], signals_by_id: Dict[str, Dict[str, float]]):
        rows = []
        for profile in profiles:
            result = self.score(profile, signals_by_id.get(profile.supplier_id, {}))
            rows.append((profile.supplier_id, result.score, result.decision.value))
        return sorted(rows, key=lambda row: row[1], reverse=True)


class SupplierDiscoveryPolicy:
    ALLOWED_SOURCES = [
        "official_company_site",
        "official_registry",
        "official_brand/distributor_page",
        "public_marketplace_listing",
        "public_trade_directory",
        "public_review_platform",
        "public_social_profile",
        "public_business_database",
    ]

    def validate_source(self, source_type):
        return source_type in self.ALLOWED_SOURCES


class SupplierMemory:
    def __init__(self):
        self.events = []

    def record(self, supplier_id, event_type, payload):
        self.events.append(
            {
                "supplier_id": supplier_id,
                "event_type": event_type,
                "payload": payload,
                "recorded_at": datetime.now(timezone.utc).isoformat(),
            }
        )

    def history(self, supplier_id):
        return [event for event in self.events if event["supplier_id"] == supplier_id]


class SupplierReport:
    @staticmethod
    def build(profile: SupplierProfile, risk: RiskResult):
        return {
            "supplier": asdict(profile),
            "risk": asdict(risk),
            "recommendation": risk.decision.value,
            "human_approval_required": True,
        }
