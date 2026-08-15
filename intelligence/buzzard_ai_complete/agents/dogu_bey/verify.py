import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from buzzard_ai_complete.config.settings import DB_PATH
from urllib.parse import urlparse

DB=DB_PATH

SOURCE_TYPES={
    "OFFICIAL_GOVERNMENT",
    "OFFICIAL_MANUFACTURER",
    "OFFICIAL_PLATFORM",
    "OFFICIAL_STANDARD",
    "SECONDARY",
    "USER_PROVIDED"
}

STATUSES={
    "UNVERIFIED","PENDING","VERIFIED",
    "CONFLICT","OUTDATED","REJECTED"
}

class OfficialVerifier:
    def connect(self):
        c=sqlite3.connect(DB)
        c.row_factory=sqlite3.Row
        return c

    def now(self):
        return datetime.now(timezone.utc).isoformat()

    def init(self):
        with self.connect() as c:
            c.executescript("""
            CREATE TABLE IF NOT EXISTS claims(
                id INTEGER PRIMARY KEY,
                entity TEXT NOT NULL,
                claim_text TEXT NOT NULL,
                category TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'UNVERIFIED',
                verification_score REAL NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS sources(
                id INTEGER PRIMARY KEY,
                claim_id INTEGER NOT NULL,
                source_type TEXT NOT NULL,
                url TEXT NOT NULL,
                publisher TEXT NOT NULL,
                published_at TEXT,
                note TEXT,
                source_quality REAL NOT NULL,
                observed_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS verification_events(
                id INTEGER PRIMARY KEY,
                claim_id INTEGER NOT NULL,
                status TEXT NOT NULL,
                note TEXT,
                created_at TEXT NOT NULL
            );
            """)

    def add_claim(self,entity,text,category):
        now=self.now()
        with self.connect() as c:
            cur=c.execute("""
                INSERT INTO claims
                (entity,claim_text,category,status,verification_score,created_at,updated_at)
                VALUES(?,?,?,?,?,?,?)
            """,(entity,text,category,"UNVERIFIED",0,now,now))
        return f"Claim #{cur.lastrowid} oluşturuldu."

    def add_source(self,claim_id,source_type,url,publisher,published,note):
        source_type=source_type.upper()
        if source_type not in SOURCE_TYPES:
            return "Geçersiz kaynak tipi: "+", ".join(sorted(SOURCE_TYPES))

        parsed=urlparse(url)
        if parsed.scheme not in ("http","https"):
            return "Yalnızca http/https URL kabul edilir."

        quality={
            "OFFICIAL_GOVERNMENT":100,
            "OFFICIAL_MANUFACTURER":95,
            "OFFICIAL_PLATFORM":92,
            "OFFICIAL_STANDARD":92,
            "SECONDARY":55,
            "USER_PROVIDED":35
        }[source_type]

        now=self.now()
        with self.connect() as c:
            claim=c.execute(
                "SELECT id FROM claims WHERE id=?",(claim_id,)
            ).fetchone()
            if not claim:
                return "Claim bulunamadı."

            c.execute("""
                INSERT INTO sources
                (claim_id,source_type,url,publisher,published_at,note,
                 source_quality,observed_at)
                VALUES(?,?,?,?,?,?,?,?)
            """,(claim_id,source_type,url,publisher,published,note,quality,now))

            c.execute("""
                UPDATE claims
                SET status='PENDING',updated_at=?
                WHERE id=?
            """,(now,claim_id))

        return f"Kaynak kaydedildi: {publisher} | kalite={quality}"

    def verify(self,claim_id,status,note):
        status=status.upper()
        if status not in STATUSES:
            return "Geçersiz durum: "+", ".join(sorted(STATUSES))

        now=self.now()
        with self.connect() as c:
            claim=c.execute(
                "SELECT id FROM claims WHERE id=?",(claim_id,)
            ).fetchone()
            if not claim:
                return "Claim bulunamadı."

            sources=c.execute("""
                SELECT source_quality FROM sources
                WHERE claim_id=?
                ORDER BY source_quality DESC
            """,(claim_id,)).fetchall()

            best=max([r["source_quality"] for r in sources],default=0)

            if status=="VERIFIED":
                score=best
                if best<90:
                    status="PENDING"
                    note=(note+" " if note else "") + \
                         "Birincil/resmî kaynak gücü yetersiz."
            elif status=="CONFLICT":
                score=20
            elif status=="OUTDATED":
                score=15
            else:
                score=0

            c.execute("""
                UPDATE claims
                SET status=?,verification_score=?,updated_at=?
                WHERE id=?
            """,(status,score,now,claim_id))

            c.execute("""
                INSERT INTO verification_events
                (claim_id,status,note,created_at)
                VALUES(?,?,?,?)
            """,(claim_id,status,note,now))

        return f"Claim #{claim_id} -> {status} | skor={score:.0f}"

    def demo(self):
        self.add_claim(
            "Example Motor Oil",
            "Üretici ürünü kendi katalogunda listeliyor.",
            "MANUFACTURER"
        )
        self.add_source(
            1,"OFFICIAL_MANUFACTURER",
            "https://example.com/product",
            "Example Manufacturer",
            "2026-08-01",
            "Demo resmi üretici kaynağı."
        )
        self.verify(1,"VERIFIED","Demo doğrulama.")

        self.add_claim(
            "Example Product",
            "Ürünün belirli pazarda satış şartı uygundur.",
            "MARKET_ACCESS"
        )
        self.add_source(
            2,"SECONDARY",
            "https://example.org/article",
            "Example Secondary",
            "2026-07-01",
            "İkincil kaynak; resmî doğrulama bekliyor."
        )

    def report(self):
        with self.connect() as c:
            claims=c.execute("""
                SELECT id,entity,claim_text,category,status,
                       verification_score,updated_at
                FROM claims
                ORDER BY verification_score DESC,updated_at DESC
            """).fetchall()

            sources=c.execute("""
                SELECT claim_id,source_type,publisher,source_quality,url
                FROM sources
                ORDER BY source_quality DESC
            """).fetchall()

        out=["=== BUZZARD v29 OFFICIAL VERIFICATION RAPORU ===",
             "","CLAIMS"]
        for r in claims:
            out.append(
                f"- #{r['id']} {r['entity']} | {r['category']} | "
                f"{r['status']} | skor={r['verification_score']:.0f}"
            )
            out.append(f"  → {r['claim_text']}")

        out += ["","KAYNAKLAR"]
        for r in sources:
            out.append(
                f"- claim #{r['claim_id']} | {r['source_type']} | "
                f"{r['publisher']} | kalite={r['source_quality']:.0f} | {r['url']}"
            )

        out += [
            "",
            "KURAL:",
            "Resmî kaynak güçlü kanıttır ancak tek başına hukuki danışmanlık değildir.",
            "Kaynağın kapsamı ve güncelliği ayrıca incelenir.",
            "Çelişen kaynaklar gizlenmez; CONFLICT olarak tutulur.",
            "Doğrulanamayan iddialar VERIFIED olarak işaretlenmez."
        ]
        return "\\n".join(out)
