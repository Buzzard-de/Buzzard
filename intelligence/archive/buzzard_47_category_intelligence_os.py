from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field
import sqlite3, datetime, os, re, unicodedata
DB=os.getenv('BUZZARD_47_DB','buzzard_47_category_intelligence.db')
app=FastAPI(title='Buzzard 47 Category Intelligence OS',version='1.0')
SCHEMA='''CREATE TABLE IF NOT EXISTS categories(id INTEGER PRIMARY KEY AUTOINCREMENT,code TEXT UNIQUE,name TEXT,parent_id INTEGER,level INTEGER NOT NULL,source TEXT DEFAULT 'master_taxonomy');
CREATE TABLE IF NOT EXISTS competitors(id INTEGER PRIMARY KEY AUTOINCREMENT,category_id INTEGER,rank INTEGER,name TEXT,domain TEXT DEFAULT '',type TEXT DEFAULT 'SPECIALIST',country TEXT DEFAULT 'DE',evidence_url TEXT DEFAULT '',revenue_eur REAL,gmv_eur REAL,verified INTEGER DEFAULT 0,status TEXT DEFAULT 'UNVERIFIED',notes TEXT DEFAULT '',UNIQUE(category_id,rank));
CREATE TABLE IF NOT EXISTS competitor_nodes(id INTEGER PRIMARY KEY AUTOINCREMENT,competitor_id INTEGER,raw_path TEXT,normalized_path TEXT,level INTEGER,node_name TEXT,parent_path TEXT,evidence_url TEXT DEFAULT '',confidence REAL DEFAULT 0,verified INTEGER DEFAULT 0,UNIQUE(competitor_id,normalized_path));
CREATE TABLE IF NOT EXISTS buzzard_nodes(id INTEGER PRIMARY KEY AUTOINCREMENT,category_id INTEGER,path TEXT,level INTEGER,node_name TEXT,parent_path TEXT,status TEXT DEFAULT 'ACTIVE',UNIQUE(category_id,path));
CREATE TABLE IF NOT EXISTS features(id INTEGER PRIMARY KEY AUTOINCREMENT,competitor_id INTEGER,feature TEXT,present INTEGER,evidence_url TEXT DEFAULT '',confidence REAL DEFAULT 0);
CREATE TABLE IF NOT EXISTS findings(id INTEGER PRIMARY KEY AUTOINCREMENT,category_id INTEGER,kind TEXT,path TEXT,title TEXT,score REAL DEFAULT 0,confidence REAL DEFAULT 0,status TEXT DEFAULT 'PROPOSED',rationale TEXT DEFAULT '',created_at TEXT);
CREATE TABLE IF NOT EXISTS research_queue(id INTEGER PRIMARY KEY AUTOINCREMENT,category_id INTEGER,competitor_id INTEGER,task_type TEXT,target TEXT,priority INTEGER DEFAULT 50,status TEXT DEFAULT 'OPEN');
CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT,actor TEXT,action TEXT,entity TEXT,entity_id TEXT,details TEXT,created_at TEXT);'''
def db():
 c=sqlite3.connect(DB);c.row_factory=sqlite3.Row;c.executescript(SCHEMA);return c
def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def norm(s):
 s=unicodedata.normalize('NFKD',(s or '').lower()).encode('ascii','ignore').decode();return re.sub(r'[^a-z0-9]+',' ',s).strip()
class Category(BaseModel):
 code:str;name:str;parent_id:int|None=None;level:int=1;source:str='master_taxonomy'
class Competitor(BaseModel):
 category_id:int;rank:int=Field(ge=1,le=20);name:str;domain:str='';type:str='SPECIALIST';country:str='DE';evidence_url:str='';revenue_eur:float|None=None;gmv_eur:float|None=None;verified:bool=False;notes:str=''
class Node(BaseModel):
 competitor_id:int;path:str;evidence_url:str='';confidence:float=0;verified:bool=False
class BuzzNode(BaseModel):
 category_id:int;path:str;status:str='ACTIVE'
class Feature(BaseModel):
 competitor_id:int;feature:str;present:bool;evidence_url:str='';confidence:float=0
class Finding(BaseModel):
 category_id:int;kind:str;path:str='';title:str;score:float=0;confidence:float=0;rationale:str=''
@app.get('/',response_class=HTMLResponse)
def home():return UI
@app.get('/api/health')
def health():return {'status':'ok','scope':'47 non-Kfz categories','target_competitors':940,'evidence_required':True}
@app.get('/api/summary')
def summary():
 c=db();q=lambda s:c.execute(s).fetchone()[0];r={'categories':q('SELECT COUNT(*) FROM categories'),'competitors':q('SELECT COUNT(*) FROM competitors'),'verified_competitors':q('SELECT COUNT(*) FROM competitors WHERE verified=1'),'verified_nodes':q('SELECT COUNT(*) FROM competitor_nodes WHERE verified=1'),'buzzard_nodes':q('SELECT COUNT(*) FROM buzzard_nodes'),'findings':q('SELECT COUNT(*) FROM findings'),'open_tasks':q("SELECT COUNT(*) FROM research_queue WHERE status='OPEN'")};c.close();return r
@app.get('/api/categories')
def categories():
 c=db();r=[dict(x) for x in c.execute('SELECT * FROM categories ORDER BY code,level,name')];c.close();return r
@app.post('/api/categories/import')
def import_categories(rows:list[Category]):
 c=db();n=0
 for x in rows:
  if norm(x.name) in ('automotive','automotive kfz','kfz'):continue
  c.execute('INSERT OR IGNORE INTO categories(code,name,parent_id,level,source) VALUES(?,?,?,?,?)',(x.code,x.name,x.parent_id,x.level,x.source));n+=c.rowcount
 c.commit();c.close();return {'added':n}
@app.post('/api/competitors')
def add_competitor(x:Competitor):
 c=db()
 if not c.execute('SELECT 1 FROM categories WHERE id=?',(x.category_id,)).fetchone():c.close();raise HTTPException(404,'Category not found')
 c.execute('''INSERT OR REPLACE INTO competitors(category_id,rank,name,domain,type,country,evidence_url,revenue_eur,gmv_eur,verified,status,notes) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)''',(x.category_id,x.rank,x.name,x.domain,x.type,x.country,x.evidence_url,x.revenue_eur,x.gmv_eur,int(x.verified),'VERIFIED' if x.verified else 'UNVERIFIED',x.notes));c.commit();i=c.execute('SELECT id FROM competitors WHERE category_id=? AND rank=?',(x.category_id,x.rank)).fetchone()['id'];c.close();return {'id':i}
@app.get('/api/categories/{cid}/competitors')
def competitors(cid:int):
 c=db();r=[dict(x) for x in c.execute('SELECT * FROM competitors WHERE category_id=? ORDER BY rank',(cid,))];c.close();return r
@app.post('/api/nodes')
def add_node(x:Node):
 p=[a.strip() for a in x.path.split('>') if a.strip()];c=db();c.execute('''INSERT OR REPLACE INTO competitor_nodes(competitor_id,raw_path,normalized_path,level,node_name,parent_path,evidence_url,confidence,verified) VALUES(?,?,?,?,?,?,?,?,?)''',(x.competitor_id,x.path,norm(' > '.join(p)),len(p),p[-1],' > '.join(p[:-1]),x.evidence_url,x.confidence,int(x.verified)));c.commit();c.close();return {'ok':True,'level':len(p)}
@app.post('/api/buzzard-nodes')
def add_buzzard_node(x:BuzzNode):
 p=[a.strip() for a in x.path.split('>') if a.strip()];c=db();c.execute('INSERT OR REPLACE INTO buzzard_nodes(category_id,path,level,node_name,parent_path,status) VALUES(?,?,?,?,?,?)',(x.category_id,x.path,len(p),p[-1],' > '.join(p[:-1]),x.status));c.commit();c.close();return {'ok':True}
@app.post('/api/features')
def add_feature(x:Feature):
 c=db();c.execute('INSERT INTO features(competitor_id,feature,present,evidence_url,confidence) VALUES(?,?,?,?,?)',(x.competitor_id,x.feature,int(x.present),x.evidence_url,x.confidence));c.commit();c.close();return {'ok':True}
@app.post('/api/findings')
def add_finding(x:Finding):
 c=db();c.execute('INSERT INTO findings(category_id,kind,path,title,score,confidence,status,rationale,created_at) VALUES(?,?,?,?,?,?,?,?,?)',(x.category_id,x.kind,x.path,x.title,x.score,x.confidence,'PROPOSED',x.rationale,now()));c.commit();c.close();return {'ok':True}
@app.get('/api/analysis/{cid}')
def analysis(cid:int):
 c=db();cat=c.execute('SELECT * FROM categories WHERE id=?',(cid,)).fetchone()
 if not cat:c.close();raise HTTPException(404,'Category not found')
 n=c.execute('SELECT COUNT(*) FROM competitors WHERE category_id=?',(cid,)).fetchone()[0]
 nodes=c.execute('''SELECT cn.normalized_path,cn.level,cn.node_name,COUNT(DISTINCT cn.competitor_id) cnt FROM competitor_nodes cn JOIN competitors cp ON cp.id=cn.competitor_id WHERE cp.category_id=? AND cn.verified=1 GROUP BY cn.normalized_path,cn.level,cn.node_name ORDER BY cn.level,cn.node_name''',(cid,)).fetchall()
 buzz={norm(x['path']) for x in c.execute('SELECT path FROM buzzard_nodes WHERE category_id=?',(cid,))}
 fs=c.execute('''SELECT f.feature,COUNT(DISTINCT f.competitor_id) cnt FROM features f JOIN competitors cp ON cp.id=f.competitor_id WHERE cp.category_id=? AND f.present=1 GROUP BY f.feature ORDER BY cnt DESC''',(cid,)).fetchall();c.close();common=[];unique=[];missing=[]
 for x in nodes:
  share=100*x['cnt']/n if n else 0;z={'path':x['normalized_path'],'level':x['level'],'competitors':x['cnt'],'share_pct':round(share,1)}
  if share>=70:common.append(z)
  if share<=10:unique.append(z)
  if x['normalized_path'] not in buzz and x['cnt']>=2:missing.append(z)
 return {'category':dict(cat),'competitors':n,'target':20,'coverage_pct':round(n/20*100,1),'common':common,'unique':unique,'buzzard_missing_candidates':missing,'common_features':[dict(x) for x in fs]}
@app.get('/api/audit')
def audit():
 c=db();r=[dict(x) for x in c.execute('SELECT * FROM audit ORDER BY id DESC LIMIT 500')];c.close();return r
UI="""<!doctype html><html lang='tr'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>BUZZARD 47 CATEGORY INTELLIGENCE OS</title><style>body{margin:0;background:#070707;color:#f4f4f4;font:14px system-ui}header{position:sticky;top:0;background:#090909;border-bottom:1px solid #292929}.top{max-width:1400px;margin:auto;padding:16px 20px}.logo{font-size:23px;font-weight:900}.logo b{color:#d7af48}.tag{color:#999;font-size:11px}nav{max-width:1400px;margin:auto;display:flex;overflow:auto;padding:0 20px}nav button{background:none;color:#999;border:0;padding:11px;border-bottom:2px solid transparent}nav button.on{color:#d7af48;border-color:#d7af48}main{max-width:1400px;margin:auto;padding:20px}.view{display:none}.view.on{display:block}h1{font-size:30px}.lead{color:#999;line-height:1.5}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.card,.panel{background:#111;border:1px solid #292929;border-radius:12px;padding:14px}.panel{margin-top:12px}.card b{display:block;color:#d7af48;font-size:25px}.card span{color:#999;font-size:11px}.wrap{overflow:auto;border:1px solid #292929;border-radius:9px}table{width:100%;min-width:850px;border-collapse:collapse}th,td{padding:9px;border-bottom:1px solid #292929;text-align:left;font-size:12px}th{color:#d7af48;background:#151515}select{background:#0d0d0d;color:white;border:1px solid #333;border-radius:8px;padding:9px}.toolbar{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}</style></head><body><header><div class='top'><div class='logo'><b>BUZZARD</b> 47 CATEGORY INTELLIGENCE OS</div><div class='tag'>Competitive Intelligence • Taxonomy • Gap Detection • Evidence</div></div><nav><button class='on' data-v='d'>Merkez</button><button data-v='c'>Kategoriler</button><button data-v='r'>Rakipler</button><button data-v='a'>Analiz</button><button data-v='l'>Audit</button></nav></header><main><section id='d' class='view on'><h1>47 Kategori Kurmay Merkezi</h1><p class='lead'>47 kategori × 20 rakip = 940 rakip hedefi. Kategori ağaçları kanıtla doğrulanır; ortak, benzersiz ve Buzzard'da olmayan yapılar ayrıştırılır.</p><div id='k' class='grid'></div></section><section id='c' class='view'><h1>Kategori Kayıtları</h1><div class='wrap'><table id='ct'></table></div></section><section id='r' class='view'><h1>Rakipler</h1><div class='toolbar'><select id='cs'></select><button onclick='loadR()'>Göster</button></div><div class='wrap'><table id='rt'></table></div></section><section id='a' class='view'><h1>Taxonomy Karşılaştırma</h1><div class='toolbar'><select id='as'></select><button onclick='loadA()'>Analiz</button></div><div id='res' class='panel'></div></section><section id='l' class='view'><h1>Audit</h1><div class='wrap'><table id='lt'></table></div></section></main><script>const $=x=>document.getElementById(x),E=x=>String(x??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));async function api(u){let r=await fetch(u),j=await r.json();if(!r.ok)throw Error(j.detail||'Hata');return j}document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{document.querySelectorAll('nav button').forEach(x=>x.classList.remove('on'));b.classList.add('on');document.querySelectorAll('.view').forEach(x=>x.classList.remove('on'));$(b.dataset.v).classList.add('on');render()});async function render(){let s=await api('/api/summary');$('k').innerHTML=[['Kategori',s.categories+'/47'],['Rakip',s.competitors+'/940'],['Doğrulanmış rakip',s.verified_competitors],['Doğrulanmış düğüm',s.verified_nodes],['Buzzard düğümü',s.buzzard_nodes],['Bulgu',s.findings],['Açık görev',s.open_tasks]].map(x=>'<div class="card"><b>'+x[1]+'</b><span>'+x[0]+'</span></div>').join('');let c=await api('/api/categories');$('ct').innerHTML='<tr><th>ID</th><th>Kod</th><th>Kategori</th><th>Seviye</th><th>Kaynak</th></tr>'+c.map(x=>'<tr><td>'+x.id+'</td><td>'+E(x.code)+'</td><td>'+E(x.name)+'</td><td>'+x.level+'</td><td>'+E(x.source)+'</td></tr>').join('');let o=c.map(x=>'<option value="'+x.id+'">'+E(x.code+' — '+x.name)+'</option>').join('');$('cs').innerHTML=o;$('as').innerHTML=o;let l=await api('/api/audit');$('lt').innerHTML='<tr><th>Zaman</th><th>Actor</th><th>Aksiyon</th><th>Entity</th><th>Detay</th></tr>'+l.map(x=>'<tr><td>'+x.created_at+'</td><td>'+E(x.actor)+'</td><td>'+E(x.action)+'</td><td>'+E(x.entity)+'</td><td>'+E(x.details)+'</td></tr>').join('')}async function loadR(){let r=await api('/api/categories/'+$('cs').value+'/competitors');$('rt').innerHTML='<tr><th>#</th><th>Rakip</th><th>Domain</th><th>Tip</th><th>Gelir</th><th>GMV</th><th>Durum</th></tr>'+r.map(x=>'<tr><td>'+x.rank+'</td><td>'+E(x.name)+'</td><td>'+E(x.domain)+'</td><td>'+E(x.type)+'</td><td>'+(x.revenue_eur??'—')+'</td><td>'+(x.gmv_eur??'—')+'</td><td>'+(x.verified?'VERIFIED':'UNVERIFIED')+'</td></tr>').join('')}async function loadA(){let r=await api('/api/analysis/'+$('as').value);$('res').innerHTML='<h2>'+E(r.category.name)+'</h2><p>Rakip kapsamı: <b>'+r.coverage_pct+'%</b></p><h3>Ortak</h3><p>'+r.common.slice(0,80).map(x=>E(x.path)+' — '+x.share_pct+'%').join(' • ')+'</p><h3>Buzzard eksik adayları</h3><p>'+r.buzzard_missing_candidates.slice(0,80).map(x=>E(x.path)+' — '+x.competitors+' rakip').join(' • ')+'</p><h3>Nadir/benzersiz</h3><p>'+r.unique.slice(0,80).map(x=>E(x.path)+' — '+x.competitors+' rakip').join(' • ')+'</p><h3>Ortak özellikler</h3><p>'+r.common_features.map(x=>E(x.feature)+' — '+x.cnt).join(' • ')+'</p>}render()</script></body></html>"""
