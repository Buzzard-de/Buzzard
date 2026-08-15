class CouncilGuardrails:
    """
    Shared rules:
    - no invented market/product facts
    - external claims need evidence
    - competitor intelligence is public/legal only
    - no sensitive customer inference
    - pricing/publication changes require policy approval
    """
    def validate(self, finding):
        if finding.confidence < 0 or finding.confidence > 1:
            raise ValueError("INVALID_CONFIDENCE")
        if finding.finding.strip() == "":
            raise ValueError("EMPTY_FINDING")
        if finding.requires_human_approval is False and any(
            x in finding.topic.lower() for x in ["price_change", "legal", "publication", "supplier_switch"]
        ):
            finding.requires_human_approval = True
        return finding
