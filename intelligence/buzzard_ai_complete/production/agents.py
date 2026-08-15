from buzzard_ai_complete.production.integrations import Integration


class LLMProvider:
    def __init__(self):
        self.integration = Integration("llm", ("LLM_API_URL", "LLM_API_KEY", "LLM_MODEL"))

    def status(self):
        return self.integration.status()

    def run(self, agent, task, tools=None):
        status = self.status()
        if status["status"] != "CONFIGURED":
            return {"status": "NOT_CONFIGURED", "agent": agent}
        return {"status": "READY_FOR_LLM_CALL", "agent": agent, "task": task, "tools": tools or []}


class AgentRuntime:
    ROLES = {
        "dogu_bey": "research_and_verification",
        "aslan_bey": "coordination_and_operations",
        "esat_bey": "defensive_security",
    }

    def __init__(self):
        self.llm = LLMProvider()

    def status(self):
        return {"roles": self.ROLES, "llm": self.llm.status()}
