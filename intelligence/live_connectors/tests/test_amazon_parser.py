from live_connectors.amazon_parser import parse_search_items


def test_parse_amazon_search_items():
    payload = {
        "searchResult": {
            "items": [
                {
                    "asin": "B001",
                    "detailPageURL": "https://www.amazon.de/dp/B001",
                    "itemInfo": {"title": {"displayValue": "Allzweckreiniger 1L"}},
                    "offers": {
                        "listings": [{"price": {"displayAmount": "2.49"}}],
                    },
                }
            ]
        }
    }
    rows = parse_search_items(
        payload,
        product_key="allzweckreiniger-1l",
        title="Allzweckreiniger",
        observed_at="2026-08-16T00:00:00+00:00",
    )
    assert len(rows) == 1
    assert rows[0]["price"] == 2.49
    assert rows[0]["seller_name"] == "Amazon.de"
