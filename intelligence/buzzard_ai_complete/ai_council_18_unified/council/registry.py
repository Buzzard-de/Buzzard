from .orchestration.router import AgentRouter
from .agents.chief_strategy import ChiefStrategyAi
from .agents.market import MarketIntelligenceAi
from .agents.demand import DemandAnalystAi
from .agents.competition import CompetitionAi
from .agents.profit import ProfitAi
from .agents.supply import SupplyAi
from .agents.forecast import ForecastAi
from .agents.tiktok import TiktokIntelligenceAi
from .agents.youtube import YoutubeIntelligenceAi
from .agents.marketplace import MarketplaceIntelligenceAi
from .agents.compliance import ComplianceRiskAi
from .agents.logistics import LogisticsAi
from .agents.customer import CustomerVoiceAi
from .agents.returns import ReturnsAi
from .agents.manufacturer import ManufacturerProductAi
from .agents.season import SeasonAi
from .agents.quality import ProductQualityAi
from .agents.country import CountryOpportunityAi

AGENT_CLASSES = [
    ChiefStrategyAi, MarketIntelligenceAi, DemandAnalystAi, CompetitionAi,
    ProfitAi, SupplyAi, ForecastAi, TiktokIntelligenceAi, YoutubeIntelligenceAi,
    MarketplaceIntelligenceAi, ComplianceRiskAi, LogisticsAi, CustomerVoiceAi,
    ReturnsAi, ManufacturerProductAi, SeasonAi, ProductQualityAi,
    CountryOpportunityAi
]

def build_registry(memory=None):
    router = AgentRouter()
    for cls in AGENT_CLASSES:
        router.register(cls(memory))
    return router
