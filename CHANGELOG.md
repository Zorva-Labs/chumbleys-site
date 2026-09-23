# Changelog — Chumbley's Detailing

Newest first. One entry per session that changed this repo: what changed, why, what the client asked for, what is still owed. Infrastructure changes also go in `site.json` and `CLAUDE.md`. Entries dated before 2026-09-17 are reconstructed from git history; the reasoning behind them is in `CLAUDE.md` and in `~/fleet/docs/archive`.

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
