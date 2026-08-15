import os

class SecretProvider:
    """Environment-backed secret provider. Production can replace this with a vault."""
    def get(self, name, default=None):
        return os.getenv(name, default)
