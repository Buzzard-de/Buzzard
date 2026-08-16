from buzzard_ai_complete.ai_council_18_unified.council.memory.shared_memory import SharedIntelligenceMemory


def test_shared_memory_accepts_dict_findings():
    memory = SharedIntelligenceMemory()
    finding_id = memory.add_finding(
        {
            "agent_id": "category_intelligence:CATEGORY_05",
            "topic": "Automotive",
            "finding": "Testbericht",
            "confidence": 0.8,
        }
    )
    assert finding_id
    assert len(memory.findings) == 1
    assert memory.findings[0].agent_id == "category_intelligence:CATEGORY_05"
