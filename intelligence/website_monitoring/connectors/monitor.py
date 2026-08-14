import json, hashlib, time
from pathlib import Path
from datetime import datetime, timezone
import requests

ROOT=Path(__file__).resolve().parents[1]
SITES=ROOT/"config/sites.json"
POLICIES=ROOT/"config/policies.json"

def now(): return datetime.now(timezone.utc).isoformat()

class MonitoringEngine:
    def __init__(self):
        self.sites=json.loads(SITES.read_text(encoding="utf-8"))
        self.policies=json.loads(POLICIES.read_text(encoding="utf-8"))

    def list_sites(self):
        return self.sites

    def public_fetch(self,url,timeout=20):
        # This method is only for URLs that Buzzard is permitted to retrieve.
        r=requests.get(url,headers={"User-Agent":"Buzzard-Intelligence/1.0"},
                       timeout=timeout,allow_redirects=True)
        raw=r.content
        return {
            "url":r.url,"status_code":r.status_code,
            "observed_at":now(),"sha256":hashlib.sha256(raw).hexdigest(),
            "bytes":len(raw),"content_type":r.headers.get("content-type","")
        }

    def source_mode(self,site):
        return site.get("access","REVIEW_REQUIRED")

    def status(self,site):
        if not site.get("enabled"):
            return "NOT_CONNECTED"
        return "READY_FOR_AUTHORIZED_CONNECTOR"

if __name__=="__main__":
    x=MonitoringEngine()
    for s in x.sites:
        print(f"{s['name']}: {x.status(s)}")
