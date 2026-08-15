from dataclasses import dataclass, field
from typing import List, Dict, Optional
from datetime import datetime, timezone
import hashlib
import urllib.request

@dataclass
class ResearchResult:
    task_id: Optional[str]
    question: str
    findings: List[Dict] = field(default_factory=list)
    status: str = "NO_EXTERNAL_PROVIDER"
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ResearchEngine:
    def __init__(self, provider=None, timeout=15):
        self.provider=provider
        self.timeout=timeout

    def run(self, question: str, task_id: Optional[str]=None):
        if self.provider is None:
            return ResearchResult(task_id, question).__dict__
        data=self.provider.search(question)
        return ResearchResult(task_id, question, data, "COMPLETED").__dict__

    def fetch(self, url: str):
        if not url.startswith(("http://","https://")):
            return {"error":"Only http/https URLs are allowed"}
        try:
            req=urllib.request.Request(url, headers={"User-Agent":"BuzzardAI/1.0"})
            with urllib.request.urlopen(req, timeout=self.timeout) as r:
                raw=r.read(1_000_000)
                content_type=r.headers.get("Content-Type","")
            text=raw.decode("utf-8", errors="replace")
            return {"url":url,"status":"COMPLETED","content_type":content_type,
                    "content":text,"content_hash":self.fingerprint(text)}
        except Exception as exc:
            return {"url":url,"status":"FAILED","error":str(exc)}

    @staticmethod
    def fingerprint(text: str) -> str:
        return hashlib.sha256(text.encode("utf-8")).hexdigest()
