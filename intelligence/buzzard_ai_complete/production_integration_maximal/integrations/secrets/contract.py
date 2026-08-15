class SecretProvider:
    def get(self, name):
        raise NotImplementedError


class EnvironmentSecretProvider(SecretProvider):
    def __init__(self, env):
        self.env = env

    def get(self, name):
        value = self.env.get(name)
        if not value:
            raise RuntimeError("SECRET_NOT_CONFIGURED:" + name)
        return value
