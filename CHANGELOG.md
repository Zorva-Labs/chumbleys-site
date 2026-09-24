# Changelog — Chumbley's Detailing

Newest first. One entry per session that changed this repo: what changed, why, what the client asked for, what is still owed. Infrastructure changes also go in `site.json` and `CLAUDE.md`. Entries dated before 2026-09-17 are reconstructed from git history; the reasoning behind them is in `CLAUDE.md` and in `~/fleet/docs/archive`.

## 2026-09-24
- Code only: the /traffic edge panel (Cloudflare zone analytics over GraphQL) now authenticates with `CF_ANALYTICS_TOKEN` — the read-only account token "Traffic-API" (Zone Analytics: Read), `CF_ANALYTICS_TOKEN` in `~/.env` — and falls back to the old `CF_ANALYTICS_EMAIL` + `CF_ANALYTICS_KEY` pair, which held the global API key that stopped authenticating estate-wide on 2026-09-23 (traffic-kit, same change in every copy). This site has no zone id and no analytics credentials, so its panel stays off; the fix is here for when it is connected.

## 2026-09-23 (chumbleys.pages.dev noindex — deploy pending)
- **`chumbleys.pages.dev` gets noindex.** Found in the estate sweep that followed a Search Console notice about harmonytax.pages.dev: this site's preview host answered 200 with `index, follow` and no header — an indexable copy of chumbleysdetailing.com, held back only by the canonical tag. `functions/_middleware.js` now sets `x-robots-tag: noindex, nofollow` on every response whose host ends in `.pages.dev` (deployment aliases included) — the same block as Nittany Tax's (the HTML path that may also set the source cookie, and everything else) — and never on chumbleysdetailing.com. Checked first that chumbleysdetailing.com (apex and www) serves the site itself and does not redirect to the pages.dev host, and that the pages.dev canonical points at chumbleysdetailing.com. Tested with a fake context (on pages.dev the page, a stylesheet, a 404 and a deployment alias carry the header; on chumbleysdetailing.com nothing does); built.
- **Not deployed yet.** The Cloudflare Global API Key in `~/.env` stopped authenticating at 22:10 UTC — a change of the Cloudflare account's email was requested at 22:09 — so `wrangler pages deploy` answered `Unknown X-Auth-Key or X-Auth-Email`. Owed: run `site.json → deploy.command` once `~/.env` works, then check `curl -sI https://chumbleys.pages.dev/` shows the header and `https://chumbleysdetailing.com/` does not. `fleet audit` fails this site until then.

## 2026-09-23 (build check, icons)
- `build.mjs`'s link check no longer reports an encoded fragment (`%23…`, from an inline SVG data URI) as a missing file, so a build that warns is a build with a real broken link.
- **`/traffic` linked icons this site never had** (`/favicon.svg`, `/favicon.ico` from the dashboard template — 404s the build now names); it links the site's own (/assets/logo-emblem.png). Deployed; checked live, every icon answers 200.

## 2026-09-23 (stop publishing the repo)
- **The site no longer publishes its internal files.** It was deployed from the repo root (`wrangler pages deploy .`), and Pages uploads everything there except `functions/`, `node_modules` and `.git` — the `.assetsignore` meant to prevent that is a Workers static-assets file Pages never reads. So `/CLAUDE.md`, `/CHANGELOG.md`, `/site.json` (client contact details), `/wrangler.toml`, `/.indexnow.json`, `/.gitignore`, `/.claude/launch.json` and every `/migrations/*.sql` answered 200. New `build.mjs` copies an allow-list into `dist/` — every root `.html` page (404 and `/traffic` included), the named files and folders, the IndexNow key; inside the folders nothing for the repo (`.md`, `.sql`, `.py`, `.sh`, `.log`, `.toml`, dotfiles, `migrations/`) — names any file a page links to that it did not copy, and ends with `site-kit lastmod` (the sitemap's real dates now go into `dist/sitemap.xml`; the root `sitemap.xml` carries none). `site.json → deploy.command` is `npx wrangler pages deploy dist …`; `site.json → build` is `node build.mjs` → `dist`; `wrangler.toml` `pages_build_output_dir = "dist"`; `.assetsignore` removed. Functions ship as before (wrangler reads `./functions` from the repo root).
- **The middleware refuses repo files** (`isRepoFile` → the site's own 404, `no-store`), whatever a deploy uploads. It was needed at once: after the first `dist/` deploy the domain still answered 200 for the exact URLs fetched during the before-check — copies held by Pages' edge (`s-maxage=604800`, a growing `age`, `cf-cache-status: DYNAMIC`; a zone purge did not reach them) while any other path, or the same one with a query string, was already 404. The middleware answers before that cache, so they went 404 on the next deploy.
- Checked: of the 50 files the root deploy published, the 34 in `dist/` are exactly the public ones, byte for byte — everything dropped is internal. A preview deployment (`--branch=allowlist-check`) served every `dist/` file and none of the internal ones, in the browser pane the pages rendered and the forms were intact (not submitted — a test would reach the client), and `/traffic` rendered its sign-in with the API answering as a function. After the production deploy the live domain serves every public file (200), `/CLAUDE.md`, `/CHANGELOG.md`, `/site.json`, `/wrangler.toml` and `/.indexnow.json` answer 404, `/traffic` shows its sign-in and `/api/traffic/data` answers 401 without a session.

## 2026-09-23 (real sitemap dates)
- **Every sitemap date is now the day that page last changed** (Michael: "Switch [sitemaps] to real change dates"). `site.json → deploy.command` and the manual's deploy block start with `node ~/site-kit/bin/site-kit.mjs lastmod`: each `<lastmod>` is the day the page's own content last changed (the words, links and structured data of the page itself — not the header or footer), read from `.indexnow.json`, where `submit` records the day a page's content changes. A changed page gets that day; an unchanged one keeps its date. Google trusts lastmod only from sites whose dates prove accurate, and Bing leans on it.
- Dates seeded once from git history (`site-kit lastmod --history`): 2026-09-17. The old sitemap said 2026-05-03, a hand-set date. Deployed; the sitemap resubmitted to Search Console (`submit --resubmit`). The step rewrites `sitemap.xml` — commit it with each deploy, as `.indexnow.json`.

## 2026-09-23 (submit on every deploy)
- **Every deploy now submits to IndexNow, Google Search Console and Bing** (Michael: "when a site is created or updated it needs to be submitted to indexnow, google search console and bing"). An IndexNow key file at the site root (a 32-hex `.txt`; not a secret — it can only submit this site's URLs), and `site.json → deploy.command` plus the manual's deploy block end with `node ~/site-kit/bin/site-kit.mjs submit`: IndexNow for the pages that changed, the sitemap resubmitted to Search Console when anything changed, the sitemap to Bing when Bing lacks it — only once the real domain serves the deploy; state in `.indexnow.json` (commit it with each deploy). It joined michael@'s Search Console today (`gsc-onboard.mjs`: a verification TXT beside the older zorvalabs@ owner's) and Bing Webmaster Tools (`~/fleet/bin/bing.mjs add`: a CNAME to verify.bing.com) — before today its Search Console sat where no token here could submit, and it was not in Bing. Deployed: IndexNow's first submission sent all 1 URL(s) (202), Search Console took the sitemap; Bing's daily sitemap cap was used up tonight, so its sitemap goes to Bing tomorrow (`node ~/fleet/bin/bing.mjs sitemaps --apply`); IndexNow already carries every change to Bing.
- Found while doing this, not changed here: this site is deployed from the repo root, so `/CLAUDE.md`, `/CHANGELOG.md`, `/site.json` and `/wrangler.toml` are served publicly (`.assetsignore` does nothing for Pages) — flagged as its own task (an allow-list build into `dist/`).

## 2026-09-22 (Bing on /traffic)
- **/traffic has a fourth section, Bing** (Michael: add Bing's report info to the traffic page on all sites). Added by `~/traffic-kit/bin/add-bing.mjs` — patched, not copied over, so this page's own changes stay: the nav link, the section (clicks and impressions from Bing against the window before, a day chart, the searches and pages Bing showed with position, a crawl table) and its self-contained script in `traffic.html`, and the endpoint `functions/api/traffic/bing.js`, behind the same password middleware as the rest of `/api/traffic`. The numbers come from gsc-ingest's daily Bing push (09:40 UTC) into this site's own D1 (`bing_*` tables). Not in Bing yet — this site's Search Console property is under the other Google account, so the import did not bring it; once it is added to Bing (`~/fleet/docs/reference/bing.md` → Not in Bing yet) and `gsc-ingest/scripts/map-bing.mjs --apply` is re-run, the section fills itself. Until then it says the site is not in Bing Webmaster Tools yet. Deployed; verified live without signing in — the page carries the section and `/api/traffic/bing` answers 401 to a request with no session.

## 2026-09-19
- Footer credit link to nashvilleswebdesign.com is now `rel="nofollow noopener"` (was followed). Michael's call, estate-wide: every credit on every site, ours and clients', is nofollow from today — a credit, not a link signal; the WebSite schema creator/provider is unchanged. No other change; redeployed.

## 2026-09-17
- `/traffic` dashboard installed with traffic-kit: D1 `chumbleys-analytics`, all nine migrations, edge page-view logging, conversion beacons on every page, password `CHUMBLEYS_TRAFFIC_PASSWORD` in `~/.env`. Verified live at https://chumbleysdetailing.com/traffic (one test page view was logged during the install). traffic-kit itself was fixed the same day to ship every migration — earlier scaffolds got only two.
- Operating manual added: `CLAUDE.md` (how it works), `site.json` (the manifest `fleet` reads) and this log. The old `CLAUDE.md`, where one existed, is replaced.
- Footer credit: Web Design, SEO and Hosting by Nashville's Web Design, followed link; creator/provider on the WebSite schema

## 2026-09-01
- Commit a portable dev-server config
- Standardise .gitignore

## 2026-06-08
- Quote form: mailto: only — no backend at all
- Switch quote form from Resend to Cloudflare MailChannels

## 2026-05-15
- Add llms.txt for AI-search citation
- SEO sweep + LCP perf pass: AVIF hero, lazy-load below-fold, trim meta

## 2026-05-03
- Intro badge: 'ISSUE #1' -> 'VROOM!'
- Bust styles.css cache so the intro overlay CSS actually reaches users
- Add intro overlay video — Maddox's silver 350Z driving by
- Move hero back above the 4-panel comic strip
- Fire generate_lead server-side via GA4 Measurement Protocol
- Fix generate_lead delivery on /thanks/
- Make 'Back to HQ' button red on /thanks/ page
- Fix /api/quote — drop onRequest wrapper that swallowed POSTs
- Replace FormSubmit with Cloudflare Pages Function + Resend
- Add /thanks/ confirmation page + GA4 conversion tracking

## 2026-05-02
- Make strip-1 / strip-2 use the same Z body as strip-3 / strip-4
- Route every BOOK IT / JOIN THE PATROL button to the quote form
- CTA phone button: yellow -> blue for contrast against the yellow panel
- Reword the 'how often' FAQ around the package tiers
- Point nav 'Contact' link at the quote form
- Add preferred-date picker to the quote form
- Add contact / quote form with service dropdown
- Add Google Maps link to social cluster
- Add Instagram + TikTok links alongside Facebook
- Add Patrol maintenance plan + Facebook link to header & footer
- Pricing tier tweaks
- Mobile audit: kill horizontal overflow at all viewport widths
- Lower /assets cache TTL so image updates propagate without manual purges
- Fix strip-3 overlap + center the gallery Z pair
- Use the original Chumbley's logo Z + restore teen Maddox
- Make the Z slammed/lowered consistently across strip + gallery
- Add opening 4-panel comic strip + Z before/after
- Use the two hand-picked hero images from Downloads
- Revert chest emblem back to original C logo
- Clean up logo + chest emblem placement
- Replace C-emblem on chest with comic-book car logo (just-detailed sparkle)
- Add comic-book version of the Chumbley's logo (assets/logo-full.png)

## 2026-05-01
- Add Google Analytics (G-ZM8FXXENGY)
- Full SEO/AEO/GEO/AIO + schema + supporting files pass
- Expand Meet Maddox copy to fill the right column
- Reviews: first name + last initial only
- Reword location: Gallatin & Hendersonville (was Nashville)
- Surface text-message option alongside calls
- Replace emoji CTA icons with comic-book inline SVGs
- Recolor service backgrounds: headlight=yellow, mobile=blue
- Strip outfit details from action image to match portrait
- Match Meet Maddox action image to the hero portrait
- Remove ceramic coating + paint correction from services

## 2026-04-30
- Mobile polish across the site
- Switch onomatopoeia color to yellow on red-bg service cards
- Action chest emblem now byte-for-byte the reference image
- Match action-image chest emblem to reference design
- Fix chest emblem position on action image
- Clean emblem placement on both hero images
- Use user-supplied reference emblem for both navbar and chest
- Refine hero image, SHINE burst color, and add truck before/after
- Before/after now shows the SAME car
- Replace wash + interior emoji with SVG pressure-washer wand and vacuum
- Initial site: Chumbley's Auto Detailing comic-book layout
