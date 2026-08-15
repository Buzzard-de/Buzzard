from dataclasses import dataclass
from urllib.request import Request,urlopen
from urllib.parse import urlparse
@dataclass
class FetchResult: url:str; status:int; content:str
class ResearchEngine:
    def __init__(self,sources): self.sources=sources
    def fetch(self,url,timeout=15):
        req=Request(url,headers={'User-Agent':'BuzzardAI/1.0 (+research)'}); 
        with urlopen(req,timeout=timeout) as r: data=r.read(2_000_000).decode('utf-8','replace'); return FetchResult(url,r.status,data)
    def register(self,url,title='',quality=.5): return self.sources.add(url,title,quality)
