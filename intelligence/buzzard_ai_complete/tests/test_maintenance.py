from buzzard_ai_complete.runtime.maintenance import TEST_TASK_TITLES, maintain_cycle


def test_maintain_cancels_test_tasks():
    from buzzard_ai_complete.agents.aslan_bey import AslanBey
    from buzzard_ai_complete.tasks.manager import TaskManager

    aslan = AslanBey()
    tid = aslan.create_research_task("SMOKE-001", "integration smoke", "NORMAL")
    assert TaskManager().get(tid)["status"] == "PENDING"

    result = maintain_cycle(cancel_tests=True, process_limit=0)
    assert tid in result["cancelled"]
    assert TaskManager().get(tid)["status"] == "CANCELLED"


def test_test_task_titles_non_empty():
    assert "SMOKE-001" in TEST_TASK_TITLES
