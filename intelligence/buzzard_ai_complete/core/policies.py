from dataclasses import dataclass

@dataclass(frozen=True)
class PolicyDecision:
    allowed: bool
    reason: str

class BuzzardPolicy:
    """Defensive and lawful-by-design policy gate."""
    BLOCKED = {
        "credential_theft", "unauthorized_access", "security_bypass",
        "private_data_acquisition", "malware_deployment", "offensive_intrusion"
    }

    def decide(self, action: str) -> PolicyDecision:
        if action in self.BLOCKED:
            return PolicyDecision(False, f"Blocked by Buzzard policy: {action}")
        return PolicyDecision(True, "Allowed")
