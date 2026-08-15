from abc import ABC, abstractmethod

class NotificationProvider(ABC):
    @abstractmethod
    def send(self, subject, message, **kwargs):
        raise NotImplementedError
