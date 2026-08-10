# Google Search Console — Buzzard24

One-time setup so Google can index **https://buzzard24.de**.

## Steps (you, ~5 minutes)

1. Open https://search.google.com/search-console
2. Add property: **URL prefix** → `https://buzzard24.de`
3. Choose verification: **HTML tag**
4. Copy the `content="..."` value from the meta tag
5. Add GitHub repository secret or variable:
   - Name: `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`
   - Value: the copied code (not the full HTML tag)
6. Push to `main` or wait for next GitHub Pages deploy
7. In Search Console click **Verify**
8. Submit sitemap: `https://buzzard24.de/sitemap.xml`
9. URL inspection → `https://buzzard24.de/` → **Request indexing**

## Expected timeline

| Query | Typical time |
|-------|----------------|
| `buzzard24` | 2–4 weeks |
| `buzzard24.de` | 1–2 weeks |
| `buzzard` alone | low priority — use brand **Buzzard24** |

Do not paste verification codes in chat — use GitHub Secrets only.
