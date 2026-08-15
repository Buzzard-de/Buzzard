from dataclasses import dataclass, field
from typing import Any, Dict, List

@dataclass
class SourceRecord:
    url: str
    title: str = ""
    publisher: str = ""
    retrieved_at: str = ""
    content_hash: str = ""

@dataclass
class Finding:
    claim: str
    source_urls: List[str] = field(default_factory=list)
    confidence: float = 0.0
    status: str = "PENDING"
    metadata: Dict[str, Any] = field(default_factory=dict)
