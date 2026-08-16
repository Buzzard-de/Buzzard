import os

from .registry import connector_health_text


def live_health_report():
    return connector_health_text()
