class WorkflowEngine:
    def __init__(self):
        self.steps = {}

    def define(self, name, steps):
        self.steps[name] = list(steps)

    def get(self, name):
        return list(self.steps.get(name, []))
