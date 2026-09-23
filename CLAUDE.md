# Chumbley's Detailing — operating manual

chumbleysdetailing.com · Cloudflare Pages `chumbleys` · github.com/Zorva-Labs/chumbleys-site · status: **live**

**Before changing anything:** read the top of `CHANGELOG.md`. **After:** append an entry there; if infrastructure changed (a secret, a database, a domain, an account id), update `site.json` and this file too. The rules that apply to every site are in `~/.claude/CLAUDE.md`; estate-wide facts (accounts, conventions, gotchas) are in `~/fleet/docs`.

## What this is
Auto-detailing site with a comic-book design: hero above a four-panel comic strip, an intro overlay video ("VROOM!" badge), quote form, `/thanks/` conversion page. 61 commits of iteration in May 2026.

## Build & deploy
```bash
set -a; . ~/.env; set +a; unset CLOUDFLARE_API_TOKEN   # credentials live in ~/.env, never in the repo
git fetch origin && git rev-list --count HEAD..origin/main   # must print 0 before any build or deploy
node ~/site-kit/bin/site-kit.mjs lastmod   # each sitemap date = the day that page last changed (and its dateModified); commit sitemap.xml after
npx wrangler pages deploy . --project-name=chumbleys --branch=main --commit-dirty=true
node ~/site-kit/bin/site-kit.mjs submit   # IndexNow + Search Console + Bing, once the real domain serves the deploy; commit .indexnow.json after
```
- deploys the repo root; nothing to build
- Or `node ~/fleet/bin/fleet.mjs deploy chumbleys`, which does the same from `site.json` and refuses a checkout that is behind origin.
- Pages binds secrets at deploy time — after any `wrangler pages secret put`, deploy again.

## How it works
- `index.html`, `styles.css`, `assets/`, `thanks/`, `_redirects`.
- Hand-written static HTML/CSS/JS — no build step, no framework. Edit the files, deploy the repo root.
- Every page carries title/description within the SEO windows, canonical, OG + Twitter card, JSON-LD graph, `llms.txt`, `robots.txt`, `sitemap.xml`; `_headers` sets the CSP and security headers (2026-05-15 SEO sweep, scanner 96–100).
- Footer credit: `Web Design, SEO and Hosting by Nashville's Web Design`, a `rel="nofollow noopener"` link (every credit in the estate is nofollow since 2026-09-19), with creator/provider on the WebSite schema node (switched from the Zorva Labs credit 2026-09-17).

## Infrastructure & accounts
- Cloudflare Pages project `chumbleys` → chumbleys.pages.dev; domain chumbleysdetailing.com.
- Google: GA4 `G-ZM8FXXENGY`. generate_lead fires on /thanks/ and server-side via the GA4 Measurement Protocol (2026-05-03)

## Forms, mail, tracking
- `/traffic` (traffic-kit, installed 2026-09-17): `functions/_middleware.js` logs every HTML page view at the edge into D1 `chumbleys-analytics` before any script runs; `assets/js/traffic-beacons.js` (loaded on every page) sends tap-to-call/email conversions, `/thanks` or `/thank-you` arrivals and time on page; dashboard is `traffic.html` at the root (served at `/traffic`), password = Pages secret `TRAFFIC_PASSWORD` = `CHUMBLEYS_TRAFFIC_PASSWORD` in `~/.env`. No geo-gate (`GEO_ALLOW=""`) — the site kept its worldwide audience. `_routes.json` keeps static folders out of the Function; `.assetsignore` keeps migrations and the manuals off the CDN.
- Quote form is `mailto:` only — every backend was removed (2026-06-08). If real lead capture is wanted, add a D1 endpoint + Gmail transport like the site-kit sites.
- GA4 `G-ZM8FXXENGY`; `generate_lead` also sent server-side through the Measurement Protocol (`GA4_API_SECRET`/`GA4_MEASUREMENT_ID` in `~/.env`).

## Gotchas
- `styles.css` has no fingerprint — bump the `?v=` query on the stylesheet link when it changes or the intro overlay CSS never reaches returning visitors (bit us 2026-05-03).

## Open items
- (nothing recorded yet)
