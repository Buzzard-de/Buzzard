from buzzard_ai_complete.core.orchestrator import BuzzardOrchestrator

def test_orchestrator_chain():
    result=BuzzardOrchestrator().run("T-CHAIN","Build a public-source research plan")
    assert result["task"].status=="COMPLETED"
    assert len(result["task"].subtasks)==3
