class CategoryCouncilBridge:
    """
    Bridges the 43 category specialists to the existing 19-agent Council.
    Category specialists publish evidence; Council agents consume summarized
    findings for strategy, profit, supply, logistics, compliance and country decisions.
    """
    def __init__(self, shared_memory):
        self.shared_memory = shared_memory

    def publish(self, report):
        self.shared_memory.add_finding({
            "agent_id": f"category_intelligence:{report.category_id}",
            "topic": report.category_id,
            "finding": report,
            "source": "43-category-intelligence"
        })
