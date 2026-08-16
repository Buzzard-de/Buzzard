from live_connectors.ebay_parser import parse_search_offers


def test_parse_search_offers_extracts_landed_price():
    payload = {
        "itemSummaries": [
            {
                "itemId": "v1|123",
                "title": "Motoröl 5W-30 5L",
                "price": {"value": "29.95", "currency": "EUR"},
                "seller": {"username": "autoteile_shop"},
                "shippingOptions": [{"shippingCost": {"value": "4.99", "currency": "EUR"}}],
                "itemWebUrl": "https://www.ebay.de/itm/123",
            }
        ]
    }
    rows = parse_search_offers(
        payload,
        product_key="motoroel-5w30-5l",
        title="Motoröl",
        observed_at="2026-08-16T00:00:00+00:00",
    )
    assert len(rows) == 1
    assert rows[0]["price"] == 29.95
    assert rows[0]["shipping_price"] == 4.99
    assert rows[0]["seller_name"].startswith("eBay")
