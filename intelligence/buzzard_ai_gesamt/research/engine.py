import hashlib, json, sys
from pathlib import Path
from urllib.error import URLError,HTTPError
from urllib.parse import urlparse
from html.parser import HTMLParser
from buzzard_ai_gesamt.config.settings import MAX_FETCH_BYTES,REQUEST_TIMEOUT
from buzzard_ai_gesamt.database.db import connect
from buzzard_ai_gesamt.core.time import now

def _guarded_urlopen(url, timeout, headers):
    root = next((p for p in Path(__file__).resolve().parents if (p / "security" / "guarded_fetch.py").exists()), None)
    if root and str(root) not in sys.path:
        sys.path.insert(0, str(root))
    from security.guarded_fetch import guarded_urlopen
    return guarded_urlopen(url, timeout=timeout, headers=headers)
class TextExtractor(HTMLParser):
    def __init__(self): super().__init__(); self.parts=[]; self.skip=0; self.title=''
    def handle_starttag(self,tag,attrs):
        if tag in {'script','style','noscript','svg'}: self.skip+=1
    def handle_endtag(self,tag):
        if tag in {'script','style','noscript','svg'} and self.skip:self.skip-=1
    def handle_data(self,data):
        if not self.skip and data.strip(): self.parts.append(data.strip())
    def text(self): return ' '.join(self.parts)
class ResearchEngine:
    def fetch(self,url,timeout=REQUEST_TIMEOUT,task_id=None,agent='dogu_bey'):
        p=urlparse(url)
        if p.scheme not in ('http','https'): raise ValueError('Only http/https URLs are allowed')
        started=now(); result={}
        try:
            with _guarded_urlopen(url, timeout, {'User-Agent':'BuzzardAI/2.0 (research; contact=admin)'}) as r:
                raw=r.read(MAX_FETCH_BYTES); ctype=r.headers.get('Content-Type',''); charset=r.headers.get_content_charset() or 'utf-8'; text=raw.decode(charset,errors='replace')
                title=''
                if 'html' in ctype.lower():
                    x=TextExtractor(); x.feed(text); text=x.text()
                text=text[:50000]; digest=hashlib.sha256(text.encode('utf-8')).hexdigest()
                with connect() as c:
                    prev=c.execute('SELECT content_hash FROM source_observations WHERE url=? ORDER BY id DESC LIMIT 1',(url,)).fetchone(); changed=1 if prev and prev['content_hash']!=digest else 0
                    c.execute('INSERT INTO source_observations(url,content_hash,title,observed_at,changed) VALUES(?,?,?,?,?)',(url,digest,title,now(),changed))
                result={'url':url,'status':r.status,'content_type':ctype,'text':text,'content_hash':digest,'changed':bool(changed)}
        except Exception as e:
            result={'url':url,'error':str(e),'egressDenied': type(e).__name__=='EgressDenied'}
        with connect() as c:
            c.execute('INSERT INTO research_runs(task_id,agent,query,url,status,result,started_at,finished_at) VALUES(?,?,?,?,?,?,?,?)',(task_id,agent,url,url,'FAILED' if 'error' in result else 'COMPLETED',json.dumps(result,ensure_ascii=False),started,now()))
        return result
