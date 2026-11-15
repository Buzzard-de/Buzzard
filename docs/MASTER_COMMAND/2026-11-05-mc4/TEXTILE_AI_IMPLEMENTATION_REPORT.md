# Textile AI implementation

**Objective:** Hub, optional preferences, recommendations, demo try-on, privacy.

**Implemented:** `TextileAiEntry` hub above category cards (`app/kategorie/[...slug]/page.tsx`); optional audience/occasion/profession/style/measures/photo; consent gates; rule recommendations with reasons; demo try-on adapter; 7/30 day retention policy; no training use.

**Modified:** `components/storefront/TextileAiEntry.tsx`, `server/lib/storefront/textileProgram.js`.

**Live:** virtual try-on LIVE_VERIFIED = false. Video is an accessible placeholder, not a licensed third-party film.

**Acceptance:** synthetic unit tests passed. Not COMPLETE.
