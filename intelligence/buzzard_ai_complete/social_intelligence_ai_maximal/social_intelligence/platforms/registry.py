from .facebook import FacebookAdapter
from .instagram import InstagramAdapter
from .tiktok import TikTokAdapter
from .youtube import YouTubeAdapter
from .pinterest import PinterestAdapter
from .reddit import RedditAdapter
from .x import XAdapter
from .linkedin import LinkedInAdapter
from .forums import PublicForumsAdapter

PLATFORMS = [
    FacebookAdapter, InstagramAdapter, TikTokAdapter, YouTubeAdapter,
    PinterestAdapter, RedditAdapter, XAdapter, LinkedInAdapter,
    PublicForumsAdapter
]

def build_platform_registry():
    return {cls.platform: cls() for cls in PLATFORMS}
