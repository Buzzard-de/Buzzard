class HumanHandoff:
    def __init__(self, provider, destinations):
        self.provider = provider
        self.destinations = destinations

    def prepare(self, session, reason):
        destination = self.destinations.get("default")
        if not destination:
            return {"status": "unavailable", "reason": "NO_HUMAN_DESTINATION"}
        return {
            "status": "ready",
            "reason": reason,
            "destination": destination,
            "transfer": self.provider.transfer(session, destination),
        }
