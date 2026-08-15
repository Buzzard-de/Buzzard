class ServiceLevelEngineV2:
    TARGETS = {"HIGH": 4, "NORMAL": 24, "LOW": 72}

    def due_hours(self, priority):
        return self.TARGETS.get(priority, 24)
