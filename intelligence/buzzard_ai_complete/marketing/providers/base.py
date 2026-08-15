from abc import ABC, abstractmethod


class AdProvider(ABC):
    name = "base"

    @abstractmethod
    def status(self):
        raise NotImplementedError

    @abstractmethod
    def create_campaign(self, campaign):
        raise NotImplementedError

    @abstractmethod
    def report(self, campaign_id):
        raise NotImplementedError
