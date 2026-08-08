# BUZZARD — CURSOR PACKAGE 11
# SEO + GOOGLE + MARKETING + TRACKING + MARKETPLACE FEEDS

## 1. PURPOSE
Build the SEO and digital-marketing foundation for Buzzard.

Dependencies:
- Packages 01–10

The goal is to make Buzzard technically discoverable, measurable and ready for professional online marketing.

## 2. TECHNICAL SEO
Implement:
- clean canonical URLs
- localized URLs
- metadata
- title tags
- meta descriptions
- Open Graph
- social sharing metadata
- XML sitemap
- robots.txt
- canonical tags
- hreflang for supported languages
- structured data/schema.org where appropriate

## 3. STRUCTURED DATA
Prepare structured data for:
- Organization
- WebSite
- BreadcrumbList
- Product
- Offer
- AggregateRating/Review where genuine data exists
- Article/BlogPosting if content section exists

Never generate fake reviews or ratings.

## 4. PRODUCT SEO
Every active product should support:
- SEO title
- meta description
- stable slug
- canonical URL
- product schema
- brand
- price
- availability
- GTIN where available
- SKU where appropriate

SEO data must be generated from the product data model, not manually duplicated in frontend components.

## 5. CATEGORY SEO
Every category should support:
- SEO title
- meta description
- canonical URL
- breadcrumb
- category introduction text
- index/follow controls where appropriate

Use the Buzzard category master from Package 01.

## 6. SEARCH INDEXING
Prevent low-value internal search/filter combinations from creating uncontrolled indexable pages.

Use appropriate canonical/noindex strategies for:
- internal search results
- duplicate filter combinations
- temporary parameters
- tracking parameters

Do not block valuable category/product pages accidentally.

## 7. SITEMAPS
Create scalable sitemaps for:
- pages
- categories
- products
- localized versions where appropriate

If the catalog becomes very large, use sitemap indexes and split files according to search-engine limits.

## 8. GOOGLE READINESS
Prepare integration points for:
- Google Search Console
- Google Analytics 4
- Google Tag Manager
- Google Merchant Center
- Google Ads conversion tracking

Do not hard-code real measurement IDs.
Use environment/configuration variables.

## 9. ANALYTICS EVENTS
Create a centralized analytics event layer.

Prepare events for:
- page_view
- view_item
- search
- view_category
- add_to_cart
- remove_from_cart
- view_cart
- begin_checkout
- add_payment_info
- purchase
- refund
- sign_up
- login
- add_to_wishlist
- shipping selection
- language change

Do not scatter provider-specific analytics code throughout every component.

## 10. CONSENT
Prepare a consent architecture for analytics/marketing technologies.
Do not load non-essential tracking before the required consent state is established.

Separate:
- necessary/functional technologies
- analytics
- marketing/advertising

The exact legal configuration must be reviewed for the target markets.

## 11. GOOGLE MERCHANT CENTER
Prepare a product-feed adapter supporting:
- product ID
- title
- description
- link
- image
- price
- availability
- brand
- GTIN where available
- condition
- category/product type

Use the normalized product model from Package 02.

## 12. MARKETPLACE FEEDS
Prepare adapter architecture for:
- Google Merchant Center
- eBay
- Amazon
- future marketplaces

Do not duplicate the core product database for each marketplace.
Use adapters/mappers.

## 13. MARKETING LANDING PAGES
Support SEO-friendly landing pages for:
- categories
- subcategories
- campaigns
- seasonal collections
- brand collections
- buying guides

Pages must use reusable components.

## 14. BLOG / CONTENT READINESS
Prepare an optional content architecture for:
- buying guides
- product guides
- automotive guides
- garden guides
- sports guides
- cleaning guides
- seasonal content

Do not create thin pages solely for search-engine traffic.

## 15. LOCAL SEO
Prepare technical support for:
- business information
- local landing pages
- contact information
- service areas where relevant
- Google Business Profile integration points

Do not create fake local businesses or fake addresses.

## 16. PERFORMANCE / CORE WEB VITALS
SEO implementation must not unnecessarily slow the site.
Pay attention to:
- LCP
- CLS
- INP
- image optimization
- lazy loading
- caching
- font loading
- JavaScript size

## 17. MULTILINGUAL SEO
Use Package 08 language architecture.
Support:
- de
- tr
- en
- ar

Ensure:
- localized metadata
- canonical URLs
- hreflang
- correct RTL rendering
- no accidental duplicate language pages

## 18. MARKETING CONFIGURATION
Create configuration placeholders for:
- GA4 ID
- GTM ID
- Google Ads conversion IDs
- Merchant Center/feed settings
- Meta Pixel where legally/technically appropriate
- TikTok Pixel where legally/technically appropriate

Never commit secrets or real production IDs into source code.

## 19. ADMIN SEO TOOLS
Authorized admin users should be able to manage:
- SEO title
- meta description
- canonical override where necessary
- index/noindex
- sitemap inclusion
- redirects
- structured-data settings where appropriate

Use role permissions from Package 07.

## 20. REDIRECTS
Prepare a redirect manager for:
- old product URLs
- renamed categories
- changed slugs
- discontinued products

Prefer permanent redirects where appropriate.

## 21. ACCEPTANCE TEST
Before completion:
1. Verify product metadata.
2. Verify category metadata.
3. Verify canonical URLs.
4. Verify hreflang.
5. Generate sitemap.
6. Verify robots.txt.
7. Validate structured data.
8. Test analytics event layer.
9. Test consent behavior.
10. Test Merchant Center feed generation.
11. Verify no fake reviews/ratings are generated.
12. Test redirect manager.
13. Test localized SEO.
14. Test mobile performance.
15. Verify marketing IDs are configuration-based.
16. Verify no secrets are exposed.
17. Confirm no console errors.

## 22. CRITICAL
Do not promise search-engine rankings.
Build technically sound SEO and measurement infrastructure.
Do not use fake reviews, fake ratings, fake traffic or misleading structured data.
