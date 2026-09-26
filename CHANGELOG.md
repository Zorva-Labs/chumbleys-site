# Changelog — Chumbley's Detailing

Newest first. One entry per session that changed this repo: what changed, why, what the client asked for, what is still owed. Infrastructure changes also go in `site.json` and `CLAUDE.md`. Entries dated before 2026-09-17 are reconstructed from git history; the reasoning behind them is in `CLAUDE.md` and in `~/fleet/docs/archive`.

## 2026-09-25 (/traffic: a thank-you page load counts as a sent form only with a saved lead behind it)
- Michael: "roll it out to all the sites", after Three Stone's `/traffic` listed a sent form that was only a load of its thank-you page (traffic-kit CHANGELOG, 2026-09-25).
- `functions/api/pv-event.js` (traffic-kit `bin/add-lead-proof.mjs`, the `// lead-proof:` block) keeps a thank-you page's `form_complete` only while a lead saved in the last two minutes has no `form_complete` yet. Any other load, such as a reload, a restored tab, the address typed or a crawler that runs scripts, is logged as `thankyou_view`, which no count reads.
- This site's D1 has no `leads` table, so nothing changes here yet: every `form_complete` stands, as before. The rule starts to count the day the site's form saves each submission to `leads`.
- Built, deployed (`d4d496b4`, production confirmed through the Pages API), submitted. A test beacon to `/api/pv-event` with no lead behind it was logged `form_complete`, as it should be without a `leads` table (events 8), and relabeled `test_form_complete`.
- Past rows are left as they are.
- **Owed:** nothing.

## 2026-09-25 (/traffic: scripts and hosting networks are labeled, never counted)
- Michael, on the traffic audit's options: "go with your recommendation for the hosting networks" (traffic-kit CHANGELOG, 2026-09-25).
- `functions/_middleware.js` (traffic-kit `bin/add-not-people.mjs`, `82b6a28`) now logs two kinds of request as bots, never as visits:
  - "Script": a user agent with no browser engine.
  - "Hosting network": a request from a data-center network (741 of them), less the ones people browse through (iCloud Private Relay, WARP, office security proxies, Google's own network, Meta's).
- It's a label on the logged row only. The geo gate and the source cookie treat these requests as people, so a VPN user's call or form keeps its source.
- Every page view now also keeps the network's number and the user agent (`pageviews.asn`, `pageviews.ua`). The columns were added to the live D1 first, then `migrations/0011_pageviews_asn_ua.sql` and the code.
- Built, checked (`traffic-kit check` Classification ✓), deployed (`8f23756b`, production confirmed through the Pages API), submitted. A request with no browser engine to the new deployment: HTTP 200, logged as "Script" with its network (AS13335) and user agent (pageviews 714).
- Past rows are left as they are.
- **Owed:** nothing.

## 2026-09-25 (/traffic: our own tools and Google's quiet fetchers are no longer visitors)
- Michael asked for an audit of what `/traffic` counts as people (the full audit is in traffic-kit's CHANGELOG, 2026-09-25). Here, 27 page views were ours, all from `fleet audit`'s preview-host fetch (Node's own user agent, a Direct visit per run since 19 Sept).
- `functions/_middleware.js` (traffic-kit `bin/add-our-checks.mjs`, `467fe81`) now logs these by name, never as visits:
  - our own tools, which have carried `NashvillesWebDesignCheck` in their user agent since today;
  - our scanners;
  - the desktop app's preview browser;
  - Google's fetchers that don't say "bot": AdWords-Express and AdWords-Instant, Read-Aloud, BusinessLinkVerification, NotebookLM, Apps Script, a bare "Google", and the rest of Google's list.
- Built, checked (`traffic-kit check` Classification ✓), deployed (`b34fda47`), submitted. Live: HTTP 200, logged as "Nashville's Web Design check" (pageviews 705).
- Past rows are left as they are (Michael: "leave the current data alone and just fix for future").
- **Owed:** nothing.

## 2026-09-25 (/traffic: the Bing tab draws again)
- Michael: "bing is working on the traffic page for sbcnashville, but not on nittanytax or harmonytax, check all sites and fix bing."
- **The cause:** since the tabbed page went on (24 Sept), its Bing tab threw whenever Bing had no search figures for the site. It counted the window back from Bing's latest day, which is null until Bing reports, and the date made from it threw, so the whole tab read "This part of the page couldn't be drawn". The sitemap, the pages Bing has found and the pages it couldn't read never showed, though the data was there.
- **Fixed** in traffic-kit (`182c67b`), with truer copy on how long Bing takes. Refreshed here with `upgrade.mjs --apply`, which changed the page only. Built, checked, deployed (`6b871753`) and submitted through `fleet deploy`. The live page carries the fix. Its Bing tab was drawn in a local harness with this site's own live data: no error.
- **What Bing shows today:** no search figures yet (Bing prepares a newly added site’s figures over about two days, then runs a few days behind); the sitemap read 23 Sept (1 page); 1 of 1 sitemap page found by Bing; no page Bing couldn’t read.
- **Owed:** nothing.

## 2026-09-24 (/traffic: a Chrome prefetch is not Google's ad review)
- Michael: roll out to every dashboard the fix first made on Blair Custom Interiors, where a lead from a Google ad came out "Unknown". Chrome fetches Google's results and ads before the click through Google's own proxy, so the fetch comes from Google's network with the ad's gclid on it. This morning's ad-review rule filed those fetches as "Google ad review", which gets no source cookie. An opened one was never counted as a visit, and its call or form lost where it came from.
- `node ~/traffic-kit/bin/add-ad-review.mjs . --apply` (traffic-kit): a request with `Sec-Purpose: prefetch` is never ad review. It is logged as "Chrome prefetch", not as a visit, and keeps its source cookie. `functions/api/pv-view.js` was added, and the `prefetched-view` block went into `assets/js/traffic-beacons.js`: when someone opens a prefetched page, it posts the visit there, once per page. The crawler card on /traffic names prefetches on their own line. Built, checked, deployed (`5bb852d0`), submitted.
- Cloudflare's edge kept serving the old `/assets/js/traffic-beacons.js` after the deploy (a fixed name cached `immutable` for a year). It was purged by URL through the zone API, and the served file now carries the block.
- No Google-network ad hits in this site's log, so there was nothing to correct.
- **Owed:** nothing.

## 2026-09-24 (/traffic: the sender's name on each form)
- Michael: show the name of the person who filled out the form in the Edge tab. This site's quote form opens the visitor's email app (a `mailto:`), so nothing is saved on the site and there is no record of the submission on the site to read a name from; where forms appear the card says so (traffic-kit `76050de`). Names come for free if the site moves to the Cloudflare lead form.
- `upgrade.mjs --apply`: `data.js` patched (`leadNames()`), `ads.js` and the page refreshed. Built, checked, deployed (`4b521b8e`); `/traffic` live with the new page.

## 2026-09-24 (/traffic: the tabbed dashboard)
- Michael: redesign the traffic page on every site — a tab for each source (Edge first, then Search Console, Analytics, Google Ads, Bing), colorful, with explanations, charts, and a Download PDF for each tab. We don't run this business's Google Ads, so its Google Ads tab is the offer: what ads would do for the business, built from its own numbers (visits from Google search, the searches ranking 4–20, visits from anyone else's ads), how we run them, and Book a call / Email Michael / the phone.
- `node ~/traffic-kit/bin/upgrade.mjs . --apply` (traffic-kit `491ce36`): `traffic.html` replaced with the tabbed page, the bar and the name carried over; `functions/api/traffic/ads.js` added (the Google Ads tab); `migrations/0010_ads.sql` added (the Ads tables, only ever applied where we run the ads).
- `functions/api/traffic/data.js` patched: day-of-week × hour and visits by source by day for the new charts, forms credited to the page their visit began on (a form is logged on the thank-you page), 53 weeks of Search Console (was 26).
- `functions/api/traffic/watch.js` added: the Search Console tab's "Edit the list" (the searches we are working to win) had no endpoint here — traffic-kit's installer never shipped it — so saving answered "Could not reach the server". It now saves to this site's `rank_watch`, which the weekly Search Console ingest mirrors.
- Built; `traffic-kit check` clean. Deployed (`6ff69810`), submitted. Live: `https://chumbleysdetailing.com/traffic` serves the tabbed page; `/api/traffic/ads` and `/api/traffic/watch` answer 401 signed out. Every column the new queries read was checked in the live D1 first.
- Refreshed the same evening with the kit's second print pass (traffic-kit `6dde5a5`: reports break between rows instead of leaving half-empty pages, the stacked cards print side by side, each switchable chart says what it shows); redeployed (`544266f1`).
- **Owed:** nothing.

## 2026-09-24 (/traffic section 4: what Bing holds now)
- Michael: add four things from Bing to the traffic page on every dashboard: which of the site's pages Bing has found and when it last read each, the pages it couldn't read, pages in its index over time, and the sitemap's status. `add-bing.mjs --apply` (traffic-kit `cf8ef48`) refreshed section 4 and `functions/api/traffic/bing.js`. The figures come from gsc-ingest's nightly Bing pull (`66f863c`). "What Bing has read" and the two new panels show even while Bing has no search figures.
- What Bing holds for chumbleysdetailing.com today: the sitemap `/sitemap.xml` read 24 Sept, 1 page, no errors; no problem pages; Bing has found 1 of the 1 pages asked about so far (1 in the sitemap).
- Built, deployed (`01e2fe98`), submitted (nothing new to send).
- **Owed:** nothing. The nightly pull keeps asking Bing about the site's pages: never asked first, then pages it hasn't found every three days, and the rest every ten.

## 2026-09-24 (GA4 moved to a Nashville's Web Design property; /traffic Analytics)
- **GA4 is now `G-EQVL6SGTES` (property 555748888, the Nashville's Web Design account)**, in place of `G-ZM8FXXENGY`. That property sits in the old Zorva daily-digest account, which michael@nashvilleswebdesign.com cannot see, so nothing could feed this site's `/traffic` from it. Michael's call, after an audit of every dashboard. The ID is swapped in `index.html` and `thanks/index.html` (its `generate_lead` follows). The new property starts its history today; the old one is simply no longer fed.
- The manual's server-side Measurement Protocol `generate_lead` had gone with the backend in `eea5f63` (the quote form went mailto-only); the manual now says so. `GA4_API_SECRET`/`GA4_MEASUREMENT_ID` in `~/.env` belonged to the old stream and nothing reads them.
- `/traffic` section 3: the site is in `~/nashvilles-network/scripts/ga4-ingest.mjs` (nightly, 06:00 CT). `functions/api/traffic/data.js` now returns `dims`, the breakdowns the six Analytics cards read (pages, channels, events, new users, countries, devices). GA4 needs a day or two before the first figures.
- Built, deployed, submitted. Confirmed on the live domain: the tag loads with the new ID and sends its page view, and the visit showed in the property's GA4 Realtime.

## 2026-09-24 (ad-review visits)
- **/traffic logs Google's own ad-review visits as bots.** Google loads ad landing pages from its own network with an ordinary browser user agent and a gclid, so the edge log counted each one as a person arriving from an ad. On Blair Custom Interiors, where it was found, that was 18 of the first 40 ad visits. `functions/_middleware.js` now carries traffic-kit's `adReviewBot()`, patched in by `~/traffic-kit/bin/add-ad-review.mjs`: a request from Google's networks (AS15169, AS396982) with a click id is the bot "Google ad review". It matches by network number, so Google Fiber customers still count as people. Committed, not deployed from here: another session's uncommitted work was in this working tree, so the change goes live with the next deploy.
- Backfill: 0 earlier row(s) matched (`isp = 'Google LLC' AND gclid = 1`) and are now `is_bot = 1, bot_name = 'Google ad review'` (re-run after the deploy for anything logged in between).

## 2026-09-23 (the /traffic edge panel's token)
- **The `/traffic` edge panel has credentials again.** It read Cloudflare's zone analytics with the global API key (`CF_ANALYTICS_EMAIL` + `CF_ANALYTICS_KEY`), which stopped authenticating when the account's email changed (22:09 UTC); those secrets were cleared, but the replacement was never put on this project, so the panel sat dark. `CF_ANALYTICS_TOKEN` — the read-only "Traffic-API" token (Zone Analytics: Read, `~/.env`), which the panel's code already reads first — is now a Pages secret on `chumbleys` (`wrangler pages secret put`), listed in `site.json → cloudflare.secrets`; redeployed the same night so it binds (0 pages changed). The token was checked against this estate's zone analytics before it went on.

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
