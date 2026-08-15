from dataclasses import dataclass
from typing import List

@dataclass
class Evidence:
    source: str
    claim: str
    confidence: float = 0.0

class VerificationEngine:
    def verify(self, evidences: List[Evidence]):
        if not evidences:
            return {"status": "UNVERIFIED", "confidence": 0.0, "conflicts": []}
        claims = {e.claim.strip().lower() for e in evidences}
        conflicts = list(claims) if len(claims) > 1 else []
        confidence = sum(max(0.0, min(1.0, e.confidence)) for e in evidences) / len(evidences)
        return {"status": "CONFLICT" if conflicts else "VERIFIED", "confidence": confidence, "conflicts": conflicts}
