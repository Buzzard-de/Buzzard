class CarrierWebhookRegistry:
    def __init__(self):
        self.handlers = {}

    def register(self, event, handler):
        self.handlers[event] = handler

    def dispatch(self, event, payload):
        handler = self.handlers.get(event)
        if handler is None:
            return {"status": "UNHANDLED", "event": event}
        return handler(payload)
