from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
import datetime
import uuid

@dataclass
class Evidence:
    source: str
    claim: str
    url: Optional[str] = None
    observed_at: Optional[str] = None
    confidence: float = 0.0

@dataclass
class AgentFinding:
    agent_id: str
    topic: str
    finding: str
    confidence: float
    evidence: List[Evidence] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    risks: List[str] = field(default_factory=list)
    data_refs: List[str] = field(default_factory=list)
    requires_human_approval: bool = False
    timestamp: str = field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat())
    finding_id: str = field(default_factory=lambda: str(uuid.uuid4()))

@dataclass
class CouncilCase:
    case_id: str
    objective: str
    context: Dict[str, Any] = field(default_factory=dict)
    findings: List[AgentFinding] = field(default_factory=list)
    status: str = "open"
