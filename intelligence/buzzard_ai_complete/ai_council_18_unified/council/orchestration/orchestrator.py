from .router import AgentRouter
from ..contracts import CouncilCase

class CouncilOrchestrator:
    def __init__(self, router, memory, guardrails):
        self.router = router
        self.memory = memory
        self.guardrails = guardrails

    def run_case(self, case: CouncilCase, agent_ids):
        for agent_id in agent_ids:
            agent = self.router.get(agent_id)
            prior = self.memory.context(agent.input_topics, limit_per_topic=10)
            finding = agent.analyze(case.objective, case.context, prior)
            finding = self.guardrails.validate(finding)
            self.memory.add_finding(finding)
            self.memory.link_case(case.case_id, finding.finding_id)
            case.findings.append(finding)
        return case

    def consensus(self, case):
        if not case.findings:
            return {"status": "no_findings"}
        avg = sum(x.confidence for x in case.findings) / len(case.findings)
        risks = []
        approvals = []
        for f in case.findings:
            risks.extend(f.risks)
            if f.requires_human_approval:
                approvals.append(f.agent_id)
        return {
            "status": "review_required",
            "confidence": round(avg, 3),
            "findings": len(case.findings),
            "risks": sorted(set(risks)),
            "approval_agents": sorted(set(approvals))
        }
