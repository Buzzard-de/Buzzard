from buzzard_ai_complete.agents.aslan_bey import AslanBey
from buzzard_ai_complete.agents.esat_bey import EsatBey


def main():
    a = AslanBey()
    tid = a.create_research_task("SMOKE-001", "Create a public-source research plan", "NORMAL")
    print("TASK:", tid)
    print("DASHBOARD:", a.dashboard())
    print("SECURITY:", EsatBey().scan_text("clean public information"))


if __name__ == "__main__":
    main()
