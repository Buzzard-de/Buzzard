class AgentRouter:
    def __init__(self):
        self.agents = {}

    def register(self, agent):
        self.agents[agent.agent_id] = agent

    def get(self, agent_id):
        if agent_id not in self.agents:
            raise KeyError("AGENT_NOT_REGISTERED:"+agent_id)
        return self.agents[agent_id]

    def all(self):
        return list(self.agents.values())
