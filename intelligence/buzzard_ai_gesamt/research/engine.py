from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
from html.parser import HTMLParser
from urllib.parse import urlparse

class TextExtractor(HTMLParser):
    def __init__(self): super().__init__(); self.parts=[]; self.skip=0
    def handle_starttag(self,tag,attrs):
        if tag in {'script','style','noscript'}: self.skip+=1
    def handle_endtag(self,tag):
        if tag in {'script','style','noscript'} and self.skip: self.skip-=1
    def handle_data(self,data):
        if not self.skip and data.strip(): self.parts.append(data.strip())
    def text(self): return ' '.join(self.parts)

class ResearchEngine:
    def fetch(self,url,timeout=15):
        p=urlparse(url)
        if p.scheme not in ('http','https'): raise ValueError('Only http/https URLs are allowed')
        req=Request(url,headers={'User-Agent':'BuzzardAI/1.0 (+research)'} )
        try:
            with urlopen(req,timeout=timeout) as r:
                raw=r.read(2_000_000); charset=r.headers.get_content_charset() or 'utf-8'
                content_type=r.headers.get('Content-Type','')
                text=raw.decode(charset,errors='replace')
                if 'html' in content_type.lower():
                    x=TextExtractor(); x.feed(text); text=x.text()
                return {'url':url,'status':r.status,'content_type':content_type,'text':text[:50000]}
        except (HTTPError,URLError,TimeoutError) as e:
            return {'url':url,'error':str(e)}
