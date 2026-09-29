# Chumbley's Detailing — operating manual

chumbleysdetailing.com · Cloudflare Pages `chumbleys` · github.com/Zorva-Labs/chumbleys-site · status: **live**

**Before changing anything:** read the top of `CHANGELOG.md`. **After:** append an entry there; if infrastructure changed (a secret, a database, a domain, an account id), update `site.json` and this file too. The rules that apply to every site are in `~/.claude/CLAUDE.md`; estate-wide facts (accounts, conventions, gotchas) are in `~/fleet/docs`.

## What this is
Auto-detailing site with a comic-book design: hero above a four-panel comic strip, an intro overlay video ("VROOM!" badge), quote form, `/thanks/` conversion page. 61 commits of iteration in May 2026.

## Build & deploy
```bash
set -a; . ~/.env; set +a; unset CLOUDFLARE_API_KEY CLOUDFLARE_EMAIL   # the account token CLOUDFLARE_API_TOKEN (since 2026-09-23); credentials live in ~/.env, never in the repo
git fetch origin && git rev-list --count HEAD..origin/main   # must print 0 before any build or deploy
node build.mjs   # dist/ = the allow-list of public files; ends with site-kit lastmod (the sitemap's real dates)
npx wrangler pages deploy dist --project-name=chumbleys --branch=main --commit-dirty=true
node ~/site-kit/bin/site-kit.mjs submit   # IndexNow + Search Console + Bing, once the real domain serves the deploy; commit .indexnow.json after
```
- **Deploy `dist/`, never the repo root** — a root deploy publishes the repo: `CLAUDE.md`, `CHANGELOG.md`, `site.json`, `wrangler.toml`, `.indexnow.json`, `migrations/` and `.claude/` all answered 200 until 2026-09-23 (Pages never reads `.assetsignore`; `~/fleet/docs/gotchas.md`). `build.mjs` copies an allow-list — every root `.html` page, the named files and folders, the IndexNow key — and names any file a page links to that it did not copy; a new public file at the root goes on its list. It ends with `site-kit lastmod`, so `dist/sitemap.xml` carries each page's real last change (the root `sitemap.xml` carries no dates). Functions still ship: wrangler reads `./functions` and `wrangler.toml` from the repo root whatever it uploads.
- Or `node ~/fleet/bin/fleet.mjs deploy chumbleys`, which runs build → deploy from `site.json` and refuses a checkout that is behind origin.
- Pages binds secrets at deploy time — after any `wrangler pages secret put`, deploy again.

## How it works
- `index.html`, `styles.css`, `assets/`, `thanks/`, `_redirects`.
- Hand-written static HTML/CSS/JS, no framework. Edit the files at the root; `build.mjs` assembles `dist/`, which is what deploys (above).
- Every page carries title/description within the SEO windows, canonical, OG + Twitter card, JSON-LD graph, `llms.txt`, `robots.txt`, `sitemap.xml`; `_headers` sets the CSP and security headers (2026-05-15 SEO sweep, scanner 96–100).
- **The FAQ is the one on the page.** `index.html` carries no FAQPage: `build.mjs` writes it into `dist/` from the page's `details.faq-item` list, word for word, and stops the build on a page that carries its own. To change a question or an answer, edit the FAQ section (since 2026-09-26, when the hand-kept copy had drifted on two answers).
- **Page speed (2026-09-26; PageSpeed mobile 67 → 92–95, LCP 10.4 → 2.9 s, 13.3 MB → 1.7 MB):**
  - Every picture on the home page is a `<picture>` of AVIF and WebP copies at the widths it's shown, with `sizes` and width/height. The PNGs stay as the fallback and for the schema. `scripts/perf-images.py` cuts the copies; a new or changed picture gets its copies there and a new name, since `/assets/*` is cached for a year.
  - The hero's preload carries the same srcset and sizes as its AVIF `<source>`. Never preload the PNG again: `type="image/png"` fetched 1.7 MB beside the AVIF.
  - The four faces are self-hosted in `assets/fonts` (`@font-face` at the top of `styles.css`), and the title's and the ticker's are preloaded. No Google Fonts link.
  - gtag.js loads after the page has painted, or at the first tap (`/thanks/` loads it at once).
  - The intro video is `preload="none"` and starts after that first paint; its poster covers the overlay until then.
- Footer credit: `Web Design, SEO and Hosting by Nashville's Web Design`, a `rel="nofollow noopener"` link (every credit in the estate is nofollow since 2026-09-19), with creator/provider on the WebSite schema node (switched from the Zorva Labs credit 2026-09-17).

- **`/about` and `/privacy` (2026-09-27).** `/about` is the origin story, moved off the home page. The home page keeps "MEET MADDOX!" and a button to it. `/privacy` says what the mailto form, GA4 and the log do: change it when the form changes. `src/facts.md` is the source for any new copy, and nothing goes on a page that isn't in it.

## Infrastructure & accounts
- Cloudflare Pages project `chumbleys` → chumbleys.pages.dev; domain chumbleysdetailing.com.
- The preview hosts, `chumbleys.pages.dev` and each deployment's `<hash>.chumbleys.pages.dev`, answer every file with `X-Robots-Tag: noindex, nofollow` from the root `_headers` (the `/migrate www` rule, since 2026-09-28). The middleware sets the same header on whatever reaches it, but `_routes.json` keeps `/assets/*` away from it.
- Google: GA4 `G-EQVL6SGTES` (property 555748888, the Nashville's Web Design account). generate_lead fires on /thanks/ in the page; the server-side Measurement Protocol send ended when the quote form went mailto-only (`eea5f63`). Since 2026-09-24, in place of `G-ZM8FXXENGY`, a property michael@nashvilleswebdesign.com cannot see (the old Zorva daily digest), so nothing could feed `/traffic` from it.

## Forms, mail, tracking
- `/traffic` (traffic-kit, installed 2026-09-17): `functions/_middleware.js` logs every HTML page view at the edge into D1 `chumbleys-analytics` before any script runs; `assets/js/traffic-beacons.js` (loaded on every page) sends tap-to-call/email conversions, `/thanks` or `/thank-you` arrivals and time on page; dashboard is `traffic.html` at the root (served at `/traffic`), password = Pages secret `TRAFFIC_PASSWORD` = `CHUMBLEYS_TRAFFIC_PASSWORD` in `~/.env`. No geo-gate (`GEO_ALLOW=""`) — the site kept its worldwide audience. `_routes.json` keeps static folders out of the Function; `.assetsignore` keeps migrations and the manuals off the CDN.
- `/traffic` also opens with our agency passwords: the Pages secret `TRAFFIC_AGENCY_PASSWORDS` (one per line, from `TRAFFIC_AGENCY_PASSWORD_<n>` in `~/.env`), stored by `node ~/traffic-kit/bin/add-agency-passwords.mjs . --apply`. The site's own password is unchanged and still signs the session.
- Quote form is `mailto:` only — every backend was removed (2026-06-08). If real lead capture is wanted, add a D1 endpoint + Gmail transport like the site-kit sites.
- GA4 `G-EQVL6SGTES` (property 555748888, the Nashville's Web Design account); `generate_lead` from the page only. `GA4_API_SECRET`/`GA4_MEASUREMENT_ID` in `~/.env` belonged to the old stream's server-side send and nothing reads them now.

## Gotchas
- `styles.css` has no fingerprint — bump the `?v=` query on the stylesheet link when it changes or the intro overlay CSS never reaches returning visitors (bit us 2026-05-03).

## Open items
- `src/facts.md`: 13 required facts `[NEED]`: Maddox's photo, his words, the stats' source (500+, 5★, 100%), the Business Profile's count and rating.
- The schema's `paymentAccepted` has no source and shows on no page (`site-kit check` fails it): Maddox to confirm it, or it comes out.
