from __future__ import annotations

from enum import Enum


class DecisionOutputType(str, Enum):
    SIGNAL = "SIGNAL"
    RECOMMENDATION = "RECOMMENDATION"
    DECISION = "DECISION"
    TASK = "TASK"
    APPROVAL_REQUEST = "APPROVAL_REQUEST"
    EXCEPTION = "EXCEPTION"
