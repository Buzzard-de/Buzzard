class SecurityPolicy:
    def authorize(self, actor, action):
        if action not in actor.get("permissions", []):
            raise PermissionError("ACTION_NOT_AUTHORIZED")
        return True

    def safe_log(self, event):
        blocked = {"password", "card_number", "cvv", "api_key", "access_token", "refresh_token"}
        return {key: value for key, value in event.items() if key not in blocked}
