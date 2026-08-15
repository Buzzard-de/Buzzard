import re

RTL = {
    "ar", "ar-SA", "ar-AE", "ar-QA", "ar-KW", "ar-BH", "ar-OM", "ar-JO", "ar-LB",
    "ar-EG", "ar-MA", "ar-DZ", "ar-TN", "ar-IQ", "ar-YE", "ar-SY", "ar-LY", "ar-SD",
}


def detect_language(text: str, fallback="de"):
    if re.search(r"[\u0600-\u06FF]", text or ""):
        return "ar"
    if re.search(r"[\u0370-\u03FF]", text or ""):
        return "el"
    if re.search(r"[\u0400-\u04FF]", text or ""):
        return "ru"
    return fallback


def is_rtl(language: str):
    return language in RTL
