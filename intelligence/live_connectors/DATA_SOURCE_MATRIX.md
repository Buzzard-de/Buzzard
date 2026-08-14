# Data Source Matrix

| Intelligence layer | Live source | Auth |
|---|---|---|
| Marketplace products/prices | eBay Browse API | OAuth app token |
| Amazon product/offer research | Amazon Creators API | OAuth 2.0 + Partner Tag |
| Own advertising/search performance | Google Ads API | OAuth 2.0 + developer token |
| Search trends | Google Trends | Public web / API alpha where approved |
| Public company/product pages | Authorized URL Fetcher | none, subject to site rules |
| Supplier data | Supplier APIs/XML/CSV when authorized | supplier-specific |
| TecDoc | Authorized TecDoc/licensed access | license/account required |

eBay's Browse API supports keyword/category/GTIN/product searches and item details.

Amazon's old Product Advertising API documentation is deprecated; Amazon's current Creators API uses OAuth 2.0 and an EU token endpoint for marketplaces including Germany.

Google Ads requires OAuth 2.0 credentials and a developer token; manager-account requests can additionally require login-customer-id.

Google Trends currently provides public Explore data, while the Trends API is an alpha program with limited tester access.
