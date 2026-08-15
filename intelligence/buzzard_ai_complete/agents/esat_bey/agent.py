from dataclasses import dataclass
from typing import Dict, Any
from buzzard_ai_complete.database.db import connect, init_db
from buzzard_ai_complete.core.time import now
from buzzard_ai_complete.core.events import EventBus

@dataclass
class SecurityEvent:
    event_type: str
    severity: str
    details: Dict[str, Any]

class EsatBey:
    name='esat_bey'
    role='AI Siber Güvenlik ve Savunma Uzmanı'
    def __init__(self):
        init_db()
        self.events=EventBus()

    def record(self,severity,event_type,message,actor='system'):
        severity=severity.upper()
        if severity not in {'INFO','LOW','MEDIUM','HIGH','CRITICAL'}:
            raise ValueError('invalid severity')
        with connect() as c:
            c.execute('INSERT INTO security_events(severity,event_type,actor,message,created_at) VALUES(?,?,?,?,?)',
                      (severity,event_type,actor,message,now()))
        self.events.emit('SECURITY_EVENT',self.name,{'severity':severity,'event_type':event_type})

    def recent(self,limit=50):
        with connect() as c:
            return [dict(r) for r in c.execute(
                'SELECT * FROM security_events ORDER BY id DESC LIMIT ?',(limit,)).fetchall()]

    def inspect(self, event):
        allowed = event.event_type not in {"credential_exfiltration", "unauthorized_access"}
        action = "ALLOW" if allowed else "ISOLATE_AND_ESCALATE"
        self.record("LOW" if allowed else "HIGH", event.event_type, action)
        return {"allowed": allowed, "severity": event.severity, "action": action}

    def scan_text(self,text):
        lowered=text.lower()
        suspicious=('private key','password dump','credential exfiltration','unauthorized access')
        hits=[x for x in suspicious if x in lowered]
        safe=not hits
        self.record('LOW' if safe else 'HIGH','TEXT_SCAN',','.join(hits) or 'clean')
        return {'safe':safe,'hits':hits}
