from .base import NotificationProvider

class ConsoleNotificationProvider(NotificationProvider):
    def send(self, subject, message, **kwargs):
        print(f"[NOTIFICATION] {subject}\n{message}")
        return {"sent": True, "channel": "console"}
