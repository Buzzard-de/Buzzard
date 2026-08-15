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
        self.findings.append(finding)
        return finding.finding_id

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
