# BUZZARD — CURSOR PACKAGE 08
# MULTILINGUAL + AUTO LANGUAGE + ARABIC RTL

## 1. PURPOSE
Build the complete multilingual architecture for Buzzard.

Languages at launch:
- German (de)
- Turkish (tr)
- English (en)
- Arabic (ar)

Architecture must allow additional languages later without rebuilding the site.

Dependencies:
- Packages 01–07

## 2. LANGUAGE SYSTEM
Create one centralized internationalization (i18n) layer.
Do not scatter language logic throughout components.

Every reusable UI component must use translation keys instead of hard-coded text.

## 3. DEFAULT LANGUAGE
German should be the default language for the German-market launch.

The system should be able to:
- detect browser language
- detect country/locale where appropriate
- select an appropriate language
- allow the customer to manually override the detected language

A manual user selection must take priority over automatic detection.

## 4. LANGUAGE SELECTOR
Provide a visible language selector in the header and appropriate mobile navigation.

Show:
- German
- Türkçe
- English
- العربية

Use accessible labels and keyboard navigation.

Do not use flags as the only language identifier.

## 5. URL / SEO ARCHITECTURE
Use stable localized routes.

Preferred architecture:
- `/de/...`
- `/tr/...`
- `/en/...`
- `/ar/...`

The exact framework routing convention may be adapted to the existing project, but the language must be represented consistently.

Do not create duplicate/conflicting URLs for the same language.

## 6. PRODUCT TRANSLATIONS
Product data must support localized:
- name
- short description
- full description
- attributes
- SEO title
- SEO description
- category labels

If a translation is unavailable, use the configured fallback language instead of showing broken UI.

## 7. CATEGORY TRANSLATIONS
Category IDs remain stable.
Translations must be linked to the same category ID.

Never create separate category databases for each language.

Example:
`cat-05` remains the same category regardless of language.

## 8. SEO
For every supported language:
- localized page title
- localized meta description
- canonical URL
- language alternate/hreflang metadata where appropriate
- localized category/product URLs where supported

Avoid duplicate-content problems.

## 9. ARABIC RTL
Arabic must activate RTL layout.

When Arabic is selected:
- document direction = RTL
- navigation mirrors appropriately
- mega menu remains usable
- product page layout remains correct
- checkout forms remain correct
- account dashboard remains correct
- tables/cards remain usable
- icons and directional controls are reviewed
- numbers/prices remain readable

Do not simply flip every element mechanically; review component behavior.

## 10. TEXT DIRECTION
Use logical CSS properties such as:
- margin-inline
- padding-inline
- inset-inline
- border-inline

Avoid unnecessary left/right hard-coding.

## 11. FORMATTING
Use locale-aware formatting for:
- currency
- dates
- numbers
- percentages
- addresses

Default commercial currency: EUR.

German locale should use German formatting.
Arabic must use an appropriate Arabic locale configuration without breaking EUR pricing.

## 12. TRANSLATION FILE STRUCTURE
Create a scalable translation structure, for example:

`locales/de/...`
`locales/tr/...`
`locales/en/...`
`locales/ar/...`

Group translations logically:
- common
- navigation
- categories
- products
- cart
- checkout
- account
- orders
- errors
- marketing
- footer
- admin where required

## 13. FALLBACKS
If a translation key is missing:
- use fallback language
- log missing translation in development
- never render raw undefined/null values
- never crash the application

## 14. EMAILS
Prepare localized templates for:
- account verification
- password reset
- order confirmation
- payment confirmation
- shipping notification
- delivery notification
- refund notification

Customer language preference should determine transactional email language where possible.

## 15. CUSTOMER LANGUAGE PREFERENCE
Store the customer's selected language in their profile/account preferences.

If a guest changes language, preserve the preference through the appropriate browser/session mechanism.

## 16. ADMIN
Admin/catalog users should be able to manage translations without changing source code where practical.

Do not allow accidental deletion of stable translation keys.

## 17. RESPONSIVE
All languages must work on:
- desktop
- laptop
- tablet
- smartphone

Pay special attention to long German words and Arabic text expansion.

## 18. ACCEPTANCE TEST
Before completion:
1. Open site in German.
2. Switch to Turkish.
3. Switch to English.
4. Switch to Arabic.
5. Verify RTL activates.
6. Open mega menu in Arabic.
7. Open product page in Arabic.
8. Open cart in Arabic.
9. Open checkout in Arabic.
10. Open customer dashboard in Arabic.
11. Verify prices remain EUR and readable.
12. Verify date/number formatting.
13. Verify language preference persists.
14. Verify browser-language detection.
15. Verify manual language selection overrides detection.
16. Verify missing translation fallback.
17. Verify localized SEO metadata.
18. Verify no console errors.

## 19. CRITICAL
Do not duplicate the entire website four times.
There must be one shared application with one component architecture and a centralized multilingual layer.
