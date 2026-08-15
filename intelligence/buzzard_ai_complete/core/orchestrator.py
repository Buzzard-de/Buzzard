from buzzard_ai_complete.agents.aslan_bey.agent import AslanBey, ManagedTask
from buzzard_ai_complete.agents.esat_bey.agent import EsatBey, SecurityEvent

class BuzzardOrchestrator:
    def __init__(self):
        self.aslan = AslanBey()
        self.esat = EsatBey()

    def run(self, task_id, objective, priority="NORMAL"):
        security = self.esat.inspect(SecurityEvent("task_execution", "LOW", {"task_id": task_id}))
        if not security["allowed"]:
            raise PermissionError("Security policy blocked the task")
        return self.aslan.execute(ManagedTask(task_id, objective, priority))
