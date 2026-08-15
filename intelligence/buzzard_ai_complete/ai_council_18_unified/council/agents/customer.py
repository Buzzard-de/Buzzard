from .base import CouncilAgent

class CustomerVoiceAi(CouncilAgent):
    agent_id = "customer_voice_ai"
    name = "Customer Voice AI"
    input_topics = "customer,returns,product,market".split(",")

    def analyze(self, objective, context, prior_findings):
        return self.finding("customer",
    f"Customer-voice assessment for: {objective}.",
    0.77,
    recommendations=["combine reviews, support themes and observed behavior without sensitive inference"],
    risks=["small_samples_can_mislead"])
