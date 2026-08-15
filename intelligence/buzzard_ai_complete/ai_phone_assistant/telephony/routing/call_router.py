class CallRouter:
    def __init__(self, provider, memory, agent, handoff):
        self.provider = provider
        self.memory = memory
        self.agent = agent
        self.handoff = handoff

    def inbound(self, session):
        session.state = "answered"
        return self.provider.answer(session)

    def build_context(self, session):
        if not session.customer_id:
            return {"verified": False, "memory": [], "recent_calls": []}
        from buzzard_ai_complete.ai_phone_assistant.memory.crm_context import build_agent_context

        return build_agent_context(self.memory, session.customer_id, session.verification_level)

    async def agent_turn(self, session, user_event):
        result = await self.agent.respond(user_event, self.build_context(session), session)
        if result.get("handoff"):
            return self.handoff.prepare(session, result.get("reason", "agent_requested"))
        return result
