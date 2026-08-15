from buzzard_ai_complete.agents.aslan_bey import AslanBey
from buzzard_ai_complete.agents.esat_bey import EsatBey
from buzzard_ai_complete.database.db import init_db


def main():
    init_db()
    a = AslanBey()
    tid = a.create_research_task("Buzzard demo", "Inspect an official public URL", "NORMAL")
    print("Created task", tid)
    EsatBey().record("INFO", "SYSTEM", "Demo initialized")


if __name__ == "__main__":
    main()
