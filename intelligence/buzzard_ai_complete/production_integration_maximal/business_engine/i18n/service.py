class InternationalizationService:
    def __init__(self, translations, country_rules):
        self.translations=translations
        self.country_rules=country_rules

    def resolve(self, browser_languages, country):
        if country in self.country_rules.get("country_languages",{}):
            return self.country_rules["country_languages"][country]
        for lang in browser_languages:
            if lang in self.translations:
                return lang
        return self.country_rules.get("default_language","de")

    def localize_product(self, product, language):
        return self.translations.get(language,{}).get(product["product_id"],product)
