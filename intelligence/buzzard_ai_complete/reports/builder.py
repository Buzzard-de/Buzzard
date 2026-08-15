from buzzard_ai_complete.database.db import connect
from buzzard_ai_complete.core.time import now
class ReportBuilder:
    def build_executive(self):
        with connect() as c:
            claims=c.execute('SELECT status,COUNT(*) n FROM claims GROUP BY status').fetchall()
            tasks=c.execute('SELECT status,COUNT(*) n FROM tasks GROUP BY status').fetchall()
            events=c.execute('SELECT event_type,COUNT(*) n FROM events GROUP BY event_type ORDER BY n DESC LIMIT 10').fetchall()
        lines=['BUZZARD AI EXECUTIVE REPORT','', 'Claims:']+[f"- {r['status']}: {r['n']}" for r in claims]
        lines += ['', 'Tasks:']+[f"- {r['status']}: {r['n']}" for r in tasks]
        lines += ['', 'Top Events:']+[f"- {r['event_type']}: {r['n']}" for r in events]
        text='\n'.join(lines)
        with connect() as c: c.execute('INSERT INTO reports(title,report_type,content,created_at) VALUES(?,?,?,?)',('Executive Report','EXECUTIVE',text,now()))
        return text
