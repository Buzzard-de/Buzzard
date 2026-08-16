class SharedIntelligenceMemory:
    """
    Common memory for all 18 agents + Doğu Bey + Esat Bey.
    Findings are append-only at the interface level and can be backed by a DB/vector store.
    """
    def __init__(self):
        self.findings = []
        self.facts = {}
        self.case_links = {}

    def add_finding(self, finding):
        finding = self._normalize_finding(finding)
        self.findings.append(finding)
        return finding.finding_id

    def _normalize_finding(self, finding):
        from buzzard_ai_complete.ai_council_18_unified.council.contracts import AgentFinding

        if isinstance(finding, AgentFinding):
            return finding
        if isinstance(finding, dict):
            payload = finding.get("finding", finding)
            text = payload if isinstance(payload, str) else str(payload)
            return AgentFinding(
                agent_id=str(finding.get("agent_id", "unknown")),
                topic=str(finding.get("topic", "")),
                finding=text,
                confidence=float(finding.get("confidence", 0.5)),
            )
        return AgentFinding(
            agent_id="unknown",
            topic="finding",
            finding=str(finding),
            confidence=0.5,
        )

    def add_fact(self, key, value, evidence=None):
        self.facts[key] = {"value": value, "evidence": evidence or []}

    def search(self, topic=None, agent_id=None, limit=50):
        rows = self.findings
        if topic:
            rows = [x for x in rows if topic.lower() in x.topic.lower() or topic.lower() in x.finding.lower()]
        if agent_id:
            rows = [x for x in rows if x.agent_id == agent_id]
        return rows[-limit:]

    def context(self, topics, limit_per_topic=10):
        return {
            topic: self.search(topic=topic, limit=limit_per_topic)
            for topic in topics
        }

    def link_case(self, case_id, finding_id):
        self.case_links.setdefault(case_id, []).append(finding_id)
