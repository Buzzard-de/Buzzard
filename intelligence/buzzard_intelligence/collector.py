import json
import time
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

import requests
from bs4 import BeautifulSoup

from .memory import MemoryEngine


class Collector:
    USER_AGENT = "BuzzardIntelligenceResearchBot/0.1 (+research; respect robots.txt)"
    REQUEST_DELAY_SECONDS = 1.5

    def __init__(self, memory=None):
        self.memory = memory or MemoryEngine()
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": self.USER_AGENT})

    def init(self):
        self.memory.init()

    def seed(self):
        return self.memory.seed_categories()

    def seed_de(self):
        return self.memory.seed_categories_de()

    def allowed_by_robots(self, url):
        parsed = urlparse(url)
        robots = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
        rp = RobotFileParser()
        rp.set_url(robots)
        try:
            rp.read()
            return rp.can_fetch(self.USER_AGENT, url)
        except Exception:
            # Unklare robots.txt: kein automatisches Crawling.
            return False

    def fetch(self, url):
        if not self.allowed_by_robots(url):
            raise RuntimeError("robots.txt verbietet den Zugriff oder konnte nicht geprüft werden.")

        response = self.session.get(url, timeout=20)
        response.raise_for_status()

        content_type = response.headers.get("content-type", "")
        if "text/html" not in content_type:
            raise RuntimeError("Quelle ist kein HTML — bitte API/Feed-Adapter verwenden.")

        return response.text

    def _jsonld(self, soup):
        objects = []
        for tag in soup.find_all("script", attrs={"type": "application/ld+json"}):
            try:
                data = json.loads(tag.string or tag.get_text())
                if isinstance(data, list):
                    objects.extend(data)
                else:
                    objects.append(data)
            except Exception:
                continue
        return objects

    def parse_product(self, html, url):
        soup = BeautifulSoup(html, "html.parser")
        data = self._jsonld(soup)

        product = {}
        for item in data:
            if not isinstance(item, dict):
                continue
            typ = item.get("@type")
            types = typ if isinstance(typ, list) else [typ]
            if "Product" in types:
                product = item
                break

        name = product.get("name") if product else None
        brand = product.get("brand") if product else None
        if isinstance(brand, dict):
            brand = brand.get("name")

        offers = product.get("offers", {}) if product else {}
        if isinstance(offers, list):
            offers = offers[0] if offers else {}

        price = offers.get("price") if isinstance(offers, dict) else None
        currency = offers.get("priceCurrency") if isinstance(offers, dict) else None

        if not name:
            h1 = soup.find("h1")
            title = soup.find("title")
            name = (
                h1.get_text(" ", strip=True)
                if h1
                else title.get_text(" ", strip=True) if title else None
            )

        return {
            "product": name,
            "brand": brand or "",
            "price": self._float(price),
            "currency": currency or "",
            "url": url,
        }

    def _float(self, value):
        if value is None:
            return None
        try:
            return float(str(value).replace(",", "."))
        except Exception:
            return None

    def collect(self, url, category, subcategory="", country="", platform="public_web"):
        html = self.fetch(url)
        item = self.parse_product(html, url)

        if not item["product"]:
            return f"SKIP | Kein Produktsignal gefunden | {url}"

        self.memory.observe(
            category=category,
            sub=subcategory,
            subsub="",
            product=item["product"],
            brand=item["brand"],
            platform=platform,
            country=country,
            price=item["price"],
            currency=item["currency"] or "EUR",
            popularity=None,
            url=item["url"],
            source_name=urlparse(url).netloc,
            confidence=0.80,
        )

        time.sleep(self.REQUEST_DELAY_SECONDS)
        price = item["price"] if item["price"] is not None else "-"
        currency = item["currency"] or ""
        return f"OK | {item['product']} | {price} {currency} | {url}"

    def collect_list(self, urls, category, subcategory="", country="", platform="public_web"):
        results = []
        for url in urls:
            try:
                results.append(self.collect(url, category, subcategory, country, platform))
            except Exception as exc:
                results.append(f"FEHLER | {url} | {exc}")
        return results
