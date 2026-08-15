from .signals.engine import SocialSignalEngine
from .analysis.trend import TrendEngine
from .analysis.product_discovery import SocialProductDiscovery
from .analysis.competitor import SocialCompetitorIntelligence
from .analysis.customer_voice import SocialCustomerVoice
from .analysis.opportunity import SocialOpportunityEngine
from .privacy.policy import SocialPublicDataPolicy

class SocialIntelligenceAI:
    agent_id="social_intelligence_ai"
    name="Social Intelligence AI"
    platforms=[
        "facebook","instagram","tiktok","youtube","pinterest",
        "reddit","x","linkedin","forums"
    ]

    def __init__(self, shared_memory=None, event_bus=None):
        self.shared_memory=shared_memory
        self.event_bus=event_bus
        self.policy=SocialPublicDataPolicy()
        self.signals=SocialSignalEngine()
        self.trends=TrendEngine()
        self.discovery=SocialProductDiscovery()
        self.competitors=SocialCompetitorIntelligence()
        self.customer_voice=SocialCustomerVoice()
        self.opportunities=SocialOpportunityEngine()

    def analyze(self, evidence, known_products, known_categories):
        allowed=[]
        rejected=[]
        for e in evidence:
            ok, reason=self.policy.allow_source({
                "private":False,
                "authenticated_area":False,
                "public_or_authorized":True,
                "platform_policy_blocked":False
            })
            if ok: allowed.append(e)
            else: rejected.append((e,reason))

        aggregate=self.signals.aggregate(allowed)
        discovered=self.discovery.discover(
            aggregate, known_products, known_categories
        )

        result={
            "agent_id":self.agent_id,
            "platforms":self.platforms,
            "evidence_count":len(allowed),
            "rejected_count":len(rejected),
            "cross_platform_topics":aggregate,
            "catalog_gap_candidates":discovered,
            "competitor_signals":self.competitors.analyze([
                {
                    "brand_or_seller":getattr(x,"author_handle",None),
                    "platform":x.platform,
                    "source_url":x.source_url
                } for x in allowed
            ])
        }

        if self.shared_memory is not None:
            self.shared_memory.add_finding({
                "agent_id":self.agent_id,
                "topic":"social_intelligence",
                "finding":result
            })
        if self.event_bus is not None:
            self.event_bus.publish("social.report",result)
        return result
