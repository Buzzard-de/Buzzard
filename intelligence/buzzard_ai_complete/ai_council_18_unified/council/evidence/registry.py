class EvidenceRegistry:
    def __init__(self):
        self.records = {}

    def register(self, evidence):
        key = f"{evidence.source}:{evidence.claim}:{evidence.url or ''}"
        self.records[key] = evidence
        return key

    def verify_confidence(self, evidence_list):
        if not evidence_list:
            return 0.0
        return sum(float(x.confidence) for x in evidence_list) / len(evidence_list)
