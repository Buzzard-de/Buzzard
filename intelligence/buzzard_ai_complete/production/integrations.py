import os
from dataclasses import dataclass


@dataclass
class Integration:
    name: str
    required_env: tuple

    def status(self):
        missing = [key for key in self.required_env if not os.getenv(key)]
        return {
            "name": self.name,
            "status": "CONFIGURED" if not missing else "NOT_CONFIGURED",
            "missing": missing,
        }


class IntegrationRegistry:
    def __init__(self):
        self.items = {}

    def register(self, name, *required_env):
        self.items[name] = Integration(name, tuple(required_env))

    def status(self):
        return {name: integration.status() for name, integration in self.items.items()}
