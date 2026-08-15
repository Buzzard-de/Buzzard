from urllib.parse import urlparse
from buzzard_ai_gesamt.database.db import connect
from buzzard_ai_gesamt.core.time import now

SOURCE_TYPES={"OFFICIAL_GOVERNMENT","OFFICIAL_MANUFACTURER","OFFICIAL_PLATFORM","OFFICIAL_STANDARD","SECONDARY","USER_PROVIDED"}
QUALITY={"OFFICIAL_GOVERNMENT":100,"OFFICIAL_MANUFACTURER":95,"OFFICIAL_PLATFORM":92,"OFFICIAL_STANDARD":92,"SECONDARY":55,"USER_PROVIDED":35}

class SourceManager:
    def add(self,claim_id,source_type,url,publisher,published_at='',note=''):
        source_type=source_type.upper()
        if source_type not in SOURCE_TYPES: raise ValueError('invalid source type')
        if urlparse(url).scheme not in ('http','https'): raise ValueError('only http/https URLs')
        with connect() as c:
            if not c.execute('SELECT 1 FROM claims WHERE id=?',(claim_id,)).fetchone(): raise KeyError('claim not found')
            cur=c.execute('''INSERT INTO sources(claim_id,source_type,url,publisher,published_at,note,source_quality,observed_at)
                             VALUES(?,?,?,?,?,?,?,?)''',(claim_id,source_type,url,publisher,published_at,note,QUALITY[source_type],now()))
        return cur.lastrowid
    def for_claim(self,claim_id):
        with connect() as c: return [dict(r) for r in c.execute('SELECT * FROM sources WHERE claim_id=? ORDER BY source_quality DESC',(claim_id,)).fetchall()]
