class CommandRouter:
    def __init__(self):
        self.commands = {}

    def register(self, name, handler):
        self.commands[name] = handler

    def dispatch(self, name, payload=None):
        handler = self.commands.get(name)
        if handler is None:
            return {"status": "UNKNOWN_COMMAND", "command": name}
        return handler(payload or {})
