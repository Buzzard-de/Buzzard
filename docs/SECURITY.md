# Buzzard Security

Protection layers for **buzzard24.de** and the Node API.

## Built-in (code)

| Layer | Protection |
|-------|------------|
| **HTTPS / HSTS** | GitHub Pages + Render TLS; HSTS in production |
| **CSP** | Content-Security-Policy on static frontend |
| **Security headers** | X-Frame-Options, nosniff, Permissions-Policy, COOP/CORP |
| **Auth** | scrypt password hashes, JWT, rate-limited login/register |
| **Account lockout** | 5 failed attempts → 30 min lock (admin + customer) |
| **Admin 2FA** | TOTP (Google Authenticator) — setup at `/admin/security-dashboard/` |
| **API** | Rate limit (180 req/min), max body 256 KB |
| **Input** | Sanitized search, validated email/password length |
| **Contact form** | Honeypot + time-trap + client rate limit |
| **SQL** | Prepared statements only (SQLite) |
| **Logging** | Security events in `server/data/security-log.json` |
| **Dashboard** | Admin Security Log at `/admin/security-dashboard/` |
| **Dependencies** | `npm run security:check` |

## Admin 2FA setup

1. Sign in at `/admin/login/` as **administrator**
2. Open **Plattform → Security Log**
3. Click **2FA einrichten**, scan secret in Authenticator app
4. Enter 6-digit code and activate

After activation, admin login requires password + TOTP code.

## Recommended (you, when going live)

### 1. Cloudflare (free) — strongest public shield

Place Cloudflare in front of **buzzard24.de**:

- DDoS protection
- Bot filtering
- Optional WAF rules
- DNS → Cloudflare → GitHub Pages

No code change required; DNS at your domain registrar.

### 2. Render API

- Set strong `JWT_SECRET` and `ADMIN_PASSWORD` in Render secrets
- Keep `BUZZARD_SALES_ENABLED=0` until payment is ready

### 3. Google Search Console

See `docs/GOOGLE_SEARCH_CONSOLE.md` — not security, but monitors indexing.

## What we do not store in Git

- JWT secrets, admin passwords, API keys, payment keys, TOTP secrets (`server/data/admin-2fa.json`)

## Report vulnerabilities

See `public/.well-known/security.txt`
