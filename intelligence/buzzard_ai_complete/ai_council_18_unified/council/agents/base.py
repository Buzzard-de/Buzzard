from ..contracts import AgentFinding, Evidence

class CouncilAgent:
    agent_id = "base"
    name = "Base Agent"
    input_topics = []

    def __init__(self, memory=None):
        self.memory = memory

    def analyze(self, objective, context, prior_findings):
        raise NotImplementedError

    def finding(self, topic, text, confidence, evidence=None, recommendations=None, risks=None, approval=False):
        return AgentFinding(
            agent_id=self.agent_id,
            topic=topic,
            finding=text,
            confidence=confidence,
            evidence=evidence or [],
            recommendations=recommendations or [],
            risks=risks or [],
            requires_human_approval=approval
        )

    def evidence(self, source, claim, url=None, confidence=0.8):
        return Evidence(source=source, claim=claim, url=url, confidence=confidence)
