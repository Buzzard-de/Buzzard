class IntelligenceHooks:
    def __init__(self, analytics=None, decision=None):
        self.analytics = analytics
        self.decision = decision

    def on_event(self, event):
        return {
            "event": event.name,
            "analytics": "ATTACHED" if self.analytics else "NOT_ATTACHED",
            "decision": "ATTACHED" if self.decision else "NOT_ATTACHED",
        }
