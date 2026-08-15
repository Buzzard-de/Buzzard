class SocialCouncilBridge:
    """
    Sends aggregate social intelligence into the existing shared Council memory.
    """
    def __init__(self, shared_memory):
        self.shared_memory=shared_memory

    def publish(self, finding):
        if hasattr(self.shared_memory, "add_finding"):
            self.shared_memory.add_finding({
                "agent_id":"social_intelligence_ai",
                "topic":"social_intelligence",
                "finding":finding
            })
