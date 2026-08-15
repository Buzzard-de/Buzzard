from buzzard_ai_complete.core.orchestrator import BuzzardOrchestrator

class BuzzardService:
    def __init__(self):
        self.orchestrator = BuzzardOrchestrator()

    def submit(self, task_id, objective, priority="NORMAL"):
        return self.orchestrator.run(task_id, objective, priority)
