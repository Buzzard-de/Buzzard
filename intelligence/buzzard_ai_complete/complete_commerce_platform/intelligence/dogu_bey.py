class DoguBeyIntelligence:
    def propose(self, proposal):
        if not proposal.get("evidence"):
            raise ValueError("EVIDENCE_REQUIRED")
        return {"status": "review_required", **proposal}
