// Edge middleware. Runs on every request before anything else, which is
// exactly why the traffic numbers it produces are trustworthy:
// nothing here depends on the visitor's browser running a script, so ad
// blockers, consent banners and tracking prevention cannot reduce them.
//
// Two jobs:
//   1. Optional geo-gate (off by default — see GEO_ALLOW in wrangler.toml).
//   2. Log every real page view to D1 for the /traffic dashboard.
//
// Analytics must never affect the response, so the logging runs inside
// context.waitUntil and every path through it is wrapped.

/* ------------------------------- crawlers ------------------------------- */

// Substring → display name. Crawlers are logged, not blocked: which AI
// crawlers read the site is the only direct evidence the AEO/GEO work is
// landing, and no off-the-shelf analytics tool shows it.
const BOTS = [
  // our-checks: our own tools and checks, logged by name and never as a visit (bin/add-our-checks.mjs patches this block into a site)
  /* Every tool of ours that loads a client's pages carries NashvillesWebDesignCheck in its user agent: migrate's
     check and status (every old URL with ?gclid=MIGRATECHECK), fleet audit, site-kit deploy's verify step,
     seo-report, the weekly watch. Without it they were people: on Three Stone, 936 of the 1,898 visits in the
     week to 25 Sept were ours, 674 of them "from Google Ads". First, so no generic rule below can name them first. */
  ['nashvilleswebdesigncheck', "Nashville's Web Design check"],
  ['nashvilleswebdesignscanner', "Nashville's Web Design scanner"],   // nashvilleswebdesign.com/seo-check/
  ['zorvalabsscanner', 'Zorva scanner'],                               // zorvalabs.com's scanner
  ['zorvalabs', 'Zorva tools'],                                        // ZorvaLabsTools: zorvalabs.com's free tools
  ['zorva-labs', 'Zorva tools'],                                       // Zorva-Labs-Footer-Audit
  ['claude/', "Nashville's Web Design check"],                         // the preview browser in our desktop app ("… Claude/<version> Chrome/…")
  // /our-checks
  // google-fetchers: Google's fetchers that name themselves, but not as a bot (bin/add-our-checks.mjs patches this block into a site)
  /* Each of these was a person on the Edge tab: no "bot" in the user agent. From Google's own lists of its
     fetchers and special-case crawlers, and from every zone's page requests (2026-09-22 to 25): AdWords-Express,
     BusinessLinkVerification, Read-Aloud, NotebookLM, Apps-Script and a bare "Google-Safety" were counted as
     visitors; AdWords-Instant and CloudVertexBot only reached "Other bot" through a URL. Never a bare "google"
     needle: the Google app's own browser ("… GoogleApp/<version>") is a person. A user agent of just "Google"
     is caught in botName(). */
  ['google-adwords', 'Google Ads bot'],                                // Google-AdWords-Express, Google-Adwords-Instant(-Mobile)
  ['google-ads-creatives', 'Google Ads bot'],                          // Google-Ads-Creatives-Assistant
  ['google-businesslinkverification', 'Google Business Profile'],
  ['google-read-aloud', 'Google Read Aloud'],
  ['google-safety', 'Google Safety'],
  ['google-agent', 'Google Agent (user)'],                             // an agent browsing for someone, like ChatGPT-User
  ['google-notebooklm', 'Google NotebookLM'],
  ['google-gemininotebook', 'Google Gemini Notebook'],
  ['google-site-verification', 'Google Site Verifier'],
  ['google-cloudvertexbot', 'Google Vertex AI'],
  ['google-cws', 'Chrome Web Store'],
  ['google-pinpoint', 'Google Pinpoint'],
  ['googleproducer', 'Google Publisher Center'],
  ['googlemessages', 'Google Messages preview'],
  ['google-apps-script', 'Google Apps Script'],
  ['apps-spreadsheets', 'Google Sheets'],                              // IMPORTXML: "(compatible; GoogleDocs; apps-spreadsheets; …)"
  ['appengine-google', 'Google App Engine'],
  ['google favicon', 'Google Favicon'],
  ['google web preview', 'Google Web Preview'],
  ['google wap proxy', 'Google WAP Proxy'],
  // /google-fetchers
  ['googlebot', 'Googlebot'],
  ['google-inspectiontool', 'Google Inspection'],
  ['storebot-google', 'Googlebot'],
  ['adsbot-google', 'Google Ads bot'],
  ['mediapartners-google', 'Google AdSense'],
  ['apis-google', 'Googlebot'],
  ['feedfetcher-google', 'Googlebot'],
  ['googleother', 'Googlebot'],
  ['google-extended', 'Google-Extended (AI)'],
  ['bingbot', 'Bingbot'],
  ['bingpreview', 'Bingbot'],
  ['msnbot', 'Bingbot'],
  ['adidxbot', 'Bingbot'],
  ['gptbot', 'OpenAI GPTBot'],
  ['oai-searchbot', 'OpenAI SearchBot'],
  ['chatgpt-user', 'ChatGPT (user)'],
  ['claudebot', 'Anthropic ClaudeBot'],
  ['claude-searchbot', 'Anthropic SearchBot'],
  ['claude-web', 'Anthropic Claude'],
  ['claude-user', 'Claude (user)'],
  ['anthropic-ai', 'Anthropic'],
  ['perplexitybot', 'PerplexityBot'],
  ['perplexity-user', 'Perplexity (user)'],
  ['applebot-extended', 'Applebot-Extended (AI)'],
  ['applebot', 'Applebot'],
  ['amazonbot', 'Amazonbot'],
  ['ccbot', 'CCBot'],
  ['duckduckbot', 'DuckDuckBot'],
  ['yandex', 'Yandex'],
  ['baiduspider', 'Baidu'],
  ['bytespider', 'ByteSpider'],
  ['meta-externalagent', 'Meta AI'],
  ['facebookexternalhit', 'Facebook preview'],
  ['linkedinbot', 'LinkedIn preview'],
  ['twitterbot', 'X preview'],
  ['slackbot', 'Slack preview'],
  ['discordbot', 'Discord preview'],
  ['whatsapp', 'WhatsApp preview'],
  ['telegrambot', 'Telegram preview'],
  ['petalbot', 'PetalBot'],
  ['semrushbot', 'SEMrush'],
  ['ahrefsbot', 'Ahrefs'],
  ['mj12bot', 'Majestic'],
  ['dotbot', 'Moz'],
  ['screaming frog', 'Screaming Frog'],
  ['lighthouse', 'Lighthouse'],
  ['pagespeed', 'PageSpeed'],
  ['zorvalabsscanner', 'Zorva scanner'],
  ['slurp', 'Yahoo Slurp'],
  ['ia_archiver', 'Internet Archive'],
  ['headlesschrome', 'Headless Chrome'],
  ['python-requests', 'Script'],
  ['curl/', 'Script'],
  ['wget', 'Script'],
  ['go-http-client', 'Script'],
  ['bot', 'Other bot'],
  ['crawler', 'Other bot'],
  ['spider', 'Other bot'],
];

function botName(ua) {
  const s = (ua || '').toLowerCase();
  if (!s) return 'Unknown agent';
  if (s === 'google') return 'Google fetcher';   // google-exact: a Google fetcher that sends only "Google" (188 on Blair in 3 days, 2026-09-25)
  for (const [needle, name] of BOTS) if (s.includes(needle)) return name;
  return null;
}

// ad-review: Google's own review visits to ad landing pages (bin/add-ad-review.mjs patches this block into a site)
/* Google loads an ad's landing page from its own network with an ordinary
   browser user agent and a click id on the URL, when the ad is reviewed and
   from time to time after. No "AdsBot" in the user agent, so botName() cannot
   see it: on Blair Custom Interiors that was 18 of the first 40 click-id page
   views (2026-09-23/24, "Google LLC", New York) against 21 billed clicks, and
   the dashboard was counting Google's reviewer as ad traffic.
   Deliberately narrow: Google's own networks AND a click id AND no prefetch.
     - By network number, never by name. AS16591 is Google Fiber, an ordinary
       ISP with customers in Nashville, and its name starts with "Google" too.
     - AS15169 (Google LLC) and AS396982 (Google Cloud). People do not browse
       from these; the likely exception, Google's own VPN on a Pixel, is caught
       only when it also arrived from an ad, and then it shows in the bot table
       as one visit rather than disappearing.
     - Only with gclid / wbraid / gbraid. Google-network page views without one
       (renderers) are left alone.
     - Never a prefetch. Chrome fetches Google's results and ads before the
       click through Google's own proxy (Private Prefetch Proxy), so that fetch
       also comes from Google's network with the click id on it. But it is
       fetched for a person, and it says so: `Sec-Purpose: prefetch`. Filed as
       ad review, it got no attribution cookie. When the person opened the
       page, Chrome served its own copy, which never reached the server, and
       their form came out "Unknown" and was not counted as an ad lead
       (Blair Custom Interiors, 2026-09-24: two of the 53 Google-network
       fetches since 9/22 were opened by a person, one of them a lead).
   A match is a bot everywhere the caller uses the name: logged under it, given
   no attribution cookie, and, like AdsBot, never geo-blocked, because a 403 to
   Google's reviewer can cost the ad its approval.

   A prefetch is logged under prefetchBot() as "Chrome prefetch", not as a
   visit, because most are never opened. It still gets its attribution
   cookie, which Chrome stores only if the person opens the page. An opened
   one is counted by the page itself: the beacons script's `prefetched-view`
   block posts it to /api/pv-view. */
const GOOGLE_ASNS = new Set([15169, 396982]);
const isPrefetch = (request) =>
  /prefetch/i.test(request?.headers?.get('sec-purpose') || request?.headers?.get('purpose') || '');
const prefetchBot = (request) => (isPrefetch(request) ? 'Chrome prefetch' : null);
function adReviewBot(request, url) {
  if (isPrefetch(request)) return null;
  if (!GOOGLE_ASNS.has(Number(request?.cf?.asn))) return null;
  const q = url.searchParams;
  return q.get('gclid') || q.get('wbraid') || q.get('gbraid') ? 'Google ad review' : null;
}
// /ad-review

// not-people: scripts and hosting networks, logged as bots but otherwise treated as people (bin/add-not-people.mjs patches this block into a site)
/* Michael's call, 2026-09-25, after an audit of what /traffic counted as people (traffic-kit CHANGELOG):
     - Script: a user agent with no browser engine in it. Every browser names one (AppleWebKit, Gecko or
       Trident); "node", aiohttp, axios, a bare "Mozilla/5.0" and "Mozilla/5.0 (compatible; X)" don't.
       A week of Cloudflare's own logs on three sites held no real browser without one.
     - Hosting network: a request from a data-center network, where bots and scrapers run. Across all 66
       databases they were about 58% of the entries counted as people, and the page's own engagement beacon
       came back for 2 to 3% of them, against 30 to 70% on home ISPs. Never the networks people browse
       through: iCloud Private Relay and WARP (Cloudflare, Akamai, Fastly), office security proxies, Google's
       own network (its prefetch proxy and ad review are named above) and Meta's (the Facebook app's browser
       can go out through it). The cost: someone on a commercial VPN that exits in a data center is logged
       here, not as a visit.
   A label, never a gate. The caller puts it on the logged row only. The geo gate and the source cookie still
   treat these requests as people, so a VPN user's call or form keeps where they came from, and a scraper
   abroad still gets the 403 (a named bot is let through). */
const scriptBot = (ua) => (ua && !/applewebkit\/|gecko\/|trident\//i.test(ua) ? 'Script' : null);
// hosting-asns: made by bin/hosting-asns.mjs (brianhama/bad-asn-list, MIT, + 27 of ours − 25 people networks) — edit there, not here
const HOSTING_ASNS = new Set([
  1442, 3223, 3561, 3722, 3842, 4229, 4250, 4694, 4851, 5577, 6188, 6724, 6870, 6939, 7203, 7349,
  7489, 7506, 7595, 7598, 7979, 8075, 8100, 8455, 8477, 8556, 8560, 8972, 9009, 9166, 9290, 9370,
  9412, 9667, 9823, 9925, 10200, 10207, 10439, 10532, 10929, 11230, 11235, 11274, 11588, 11831, 11878, 12586,
  12617, 12876, 12989, 13209, 13213, 13647, 13739, 13909, 13926, 13955, 14061, 14120, 14127, 14160, 14244, 14384,
  14415, 14442, 14567, 14576, 14618, 14708, 14956, 14986, 14987, 14992, 15003, 15083, 15189, 15395, 15497, 15510,
  15626, 15734, 15919, 16125, 16262, 16276, 16284, 16397, 16509, 16535, 16628, 16862, 16973, 17019, 17216, 17439,
  17669, 17881, 17918, 17920, 17971, 18120, 18450, 18570, 18779, 18978, 19084, 19133, 19234, 19318, 19437, 19531,
  19624, 19844, 19871, 19969, 20021, 20068, 20248, 20264, 20401, 20448, 20450, 20454, 20473, 20598, 20692, 20738,
  20773, 20836, 20860, 21100, 21159, 21217, 21321, 21859, 22152, 22363, 22400, 22552, 22611, 22612, 22720, 22781,
  22903, 23033, 23052, 23108, 23273, 23342, 23352, 23535, 23881, 24220, 24381, 24482, 24549, 24558, 24611, 24679,
  24725, 24768, 24875, 24931, 24940, 24958, 24961, 24971, 24997, 25048, 25128, 25163, 25260, 25369, 25379, 25532,
  25642, 25780, 25820, 25926, 26277, 26481, 26484, 26496, 26666, 26978, 27175, 27223, 27229, 27257, 27357, 27589,
  27597, 27640, 28099, 28216, 28333, 28747, 28753, 28855, 28997, 29066, 29067, 29073, 29097, 29119, 29140, 29182,
  29302, 29311, 29331, 29354, 29452, 29465, 29550, 29691, 29713, 29748, 29802, 29854, 29869, 29883, 30083, 30152,
  30176, 30235, 30475, 30633, 30693, 30849, 30900, 30998, 31103, 31240, 31472, 31590, 31659, 31698, 31898, 31981,
  32097, 32181, 32244, 32275, 32306, 32338, 32400, 32475, 32489, 32613, 32647, 32740, 32780, 32911, 33070, 33083,
  33182, 33251, 33260, 33302, 33322, 33330, 33387, 33438, 33480, 33552, 33569, 33724, 33785, 33891, 34305, 34432,
  34541, 34649, 34745, 34971, 34989, 35017, 35278, 35295, 35366, 35415, 35467, 35470, 35662, 35908, 35914, 35916,
  35974, 36007, 36024, 36114, 36236, 36351, 36352, 36408, 36536, 36666, 36791, 36873, 36887, 36920, 36970, 37018,
  37088, 37153, 37209, 37230, 37248, 37269, 37280, 37308, 37347, 37377, 37472, 37506, 37521, 37540, 37643, 37661,
  37692, 37714, 37963, 38001, 38107, 38279, 38894, 39020, 39326, 39351, 39392, 39451, 39458, 39572, 39704, 39756,
  39839, 40156, 40244, 40281, 40374, 40438, 40539, 40676, 40715, 40728, 40819, 40824, 40861, 41062, 41079, 41369,
  41427, 41562, 41653, 41665, 42120, 42160, 42210, 42244, 42311, 42331, 42399, 42400, 42418, 42442, 42465, 42473,
  42612, 42622, 42695, 42699, 42705, 42708, 42730, 42776, 42831, 43021, 43146, 43198, 43289, 43317, 43350, 43472,
  43541, 43620, 44050, 44066, 44398, 44901, 45090, 45102, 45152, 45179, 45187, 45201, 45470, 45481, 45486, 45577,
  45671, 45693, 45815, 45887, 46177, 46260, 46261, 46430, 46433, 46475, 46562, 46664, 46805, 46816, 46844, 46873,
  46945, 47143, 47161, 47172, 47205, 47328, 47385, 47447, 47549, 47577, 47583, 47588, 47625, 48031, 48093, 48446,
  48812, 48825, 48896, 49313, 49349, 49453, 49485, 49505, 49532, 49544, 49693, 49815, 49834, 49949, 49981, 50297,
  50465, 50495, 50608, 50613, 50655, 50673, 50872, 50915, 50926, 50968, 50986, 51050, 51109, 51159, 51167, 51191,
  51241, 51248, 51290, 51294, 51395, 51430, 51447, 51698, 51731, 51765, 51852, 52048, 52173, 52219, 52236, 52270,
  52321, 52335, 52347, 52465, 52674, 52925, 53013, 53055, 53057, 53101, 53221, 53225, 53281, 53332, 53340, 53342,
  53370, 53559, 53589, 53597, 53667, 53755, 53850, 53889, 53914, 53918, 54104, 54203, 54290, 54334, 54455, 54489,
  54500, 54527, 54540, 54555, 54641, 54817, 54825, 54839, 55051, 55225, 55229, 55286, 55293, 55536, 55720, 55761,
  55799, 55933, 55967, 56106, 56110, 56322, 56617, 56630, 56732, 56784, 56799, 56934, 57043, 57169, 57230, 57286,
  57345, 57363, 57669, 57682, 57752, 57773, 57858, 57879, 58073, 58113, 58305, 58667, 58797, 58922, 58936, 59135,
  59253, 59349, 59432, 59504, 59554, 59615, 59632, 59677, 59705, 59729, 59764, 59791, 59795, 59816, 59854, 60011,
  60068, 60117, 60118, 60404, 60476, 60485, 60505, 60558, 60567, 60739, 60781, 60800, 61102, 61107, 61147, 61157,
  61280, 61317, 61412, 61440, 62026, 62049, 62071, 62082, 62088, 62217, 62240, 62282, 62310, 62370, 62471, 62540,
  62563, 62567, 62605, 62651, 62756, 62838, 62874, 62899, 63008, 63018, 63119, 63128, 63129, 63199, 63213, 63473,
  63916, 63949, 64245, 64286, 64484, 132070, 132071, 132203, 132225, 132425, 132509, 132717, 132779, 132816, 132869, 133120,
  133143, 133229, 133296, 133393, 133480, 133752, 134451, 135822, 136258, 149428, 150436, 152950, 196645, 196678, 196745, 196827,
  197155, 197328, 197372, 197395, 197439, 197540, 197648, 197902, 197914, 198047, 198153, 198171, 198310, 198313, 198347, 198375,
  198414, 198432, 198651, 198968, 199129, 199213, 199481, 199653, 199733, 199847, 199883, 199990, 199997, 200000, 200019, 200039,
  200147, 200532, 200904, 201011, 201200, 201449, 201525, 201553, 201597, 201630, 201634, 201670, 201702, 201709, 201862, 201983,
  202023, 202053, 202118, 202836, 203523, 203629, 204196, 205659, 205964, 206898, 209709, 212238, 212385, 262170, 262287, 262603,
  262978, 262990, 263032, 263093, 263237, 327705, 327784, 327813, 328035, 393326, 394256, 394380, 395089, 395111, 395978, 396982,
  398779, 400940, 402205, 402206, 402207,
]);
const HOSTING_ORGS = new Set([
  "6 collyer quay",
  "16 collyer quay",
  "16 collyer quay # 18-29 income at raffles",
  "earthmeta multimedia studios llc",
  "myacct ltd",
  "hostroyale technologies pvt ltd",
  "hostroyale llc",
  "hostpapa",
]);
// /hosting-asns
function hostingBot(request) {
  const cf = request?.cf || {};
  if (HOSTING_ASNS.has(Number(cf.asn))) return 'Hosting network';
  return HOSTING_ORGS.has(String(cf.asOrganization || '').trim().toLowerCase()) ? 'Hosting network' : null;
}
const notPerson = (request, ua) => scriptBot(ua) || hostingBot(request);
// /not-people

function deviceOf(ua) {
  const s = (ua || '').toLowerCase();
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(s)) return 'tablet';
  if (/mobi|iphone|ipod|android|blackberry|windows phone/.test(s)) return 'mobile';
  return 'desktop';
}

/* ------------------------------ path rules ------------------------------ */

const STATIC_EXT =
  /\.(png|jpe?g|webp|gif|svg|ico|avif|css|js|mjs|woff2?|ttf|otf|eot|map|txt|xml|webmanifest|json|pdf|mp4|webm)$/i;

const isStatic = (p) => STATIC_EXT.test(p) || p.startsWith('/assets/');

// Owner and machine surfaces are never geo-gated and never counted as traffic.
const isPrivate = (p) => p.startsWith('/traffic') || p.startsWith('/api/');

// Repository files that are never served, whatever a deploy uploads. Until
// 2026-09-23 this site was deployed from the repo root and served its manual,
// changelog, manifest, wrangler.toml, .indexnow.json, migrations/ and .claude/;
// build.mjs now deploys an allow-list (dist/), and this is the belt to that
// brace — it also answers 404 over any copy an edge cache still holds.
const isRepoFile = (p) =>
  /^\/(scripts|migrations|functions|tools|\.claude|\.wrangler|node_modules)(\/|$)/i.test(p) ||
  /^\/(CLAUDE\.md|CHANGELOG\.md|CHECKLIST\.md|README\.md|site\.json|wrangler\.toml|build\.mjs|package(-lock)?\.json|\.gitignore|\.assetsignore|\.indexnow\.json|\.dev\.vars)$/i.test(p) ||
  /\.(mjs|sql|toml|py|log|mbtree)$/i.test(p);

// The site's own 404 page with a 404 status (Pages serves 404.html as /404 with a 200).
async function notFound(context, url) {
  const headers = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' };
  try {
    const page = await context.env.ASSETS.fetch(new URL('/404', url).toString());
    if (page && page.ok) return new Response(page.body, { status: 404, headers });
  } catch { /* fall through */ }
  return new Response('Not found', { status: 404, headers: { ...headers, 'content-type': 'text/plain' } });
}

/* -------------------------------- handler ------------------------------- */

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  if (isRepoFile(path)) return notFound(context, url);
  const ua = request.headers.get('user-agent') || '';
  const bot = botName(ua) || adReviewBot(context.request, url);
  // chumbleys.pages.dev serves the same HTML as chumbleysdetailing.com. It must never be
  // indexed as a duplicate of the real domain: noindex it at the edge on every
  // response, keep serving it (it is the preview copy). Until 2026-09-23 it went
  // out indexable, held back only by the canonical tag.
  const isFallbackHost = url.hostname.endsWith('.pages.dev');

  // Optional geo-gate. Empty GEO_ALLOW (the default) means everyone is served
  // and the dashboard does the separating instead — 403-ing a real visitor is
  // a worse failure than counting a bot.
  const allow = String(env.GEO_ALLOW || '')
    .split(',')
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);

  if (allow.length && !isStatic(path) && !isPrivate(path) && !bot) {
    const cf = request.cf || {};
    const country = request.cf?.country || request.headers.get('cf-ipcountry') || '';
    // A missing country means we are not behind the CF edge (local dev) —
    // allow, rather than risk false blocks on real visitors.
    if (country && !allow.includes(country)) {
      return new Response(blockedPage(country), {
        status: 403,
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-store',
          'x-robots-tag': 'noindex',
          vary: 'user-agent',
        },
      });
    }
  }

  // Fetch the response first, then log only if it is a real page (200 + HTML),
  // so probes to non-existent URLs that 404 never pollute the counts.
  const res = await next();
  try {
    const ct = res?.headers.get('content-type') || '';
    if (res && res.status === 200 && ct.includes('text/html')) {
      logPageview(context, url, ua, bot || prefetchBot(context.request) || notPerson(context.request, ua));
      const cookie = sourceCookie(context, url, ua, bot);
      if (cookie || isFallbackHost) {
        const out = new Response(res.body, res);
        if (cookie) out.headers.append('set-cookie', cookie);
        if (isFallbackHost) out.headers.set('x-robots-tag', 'noindex, nofollow');
        return out;
      }
    } else if (res && isFallbackHost) {
      const out = new Response(res.body, res);
      out.headers.set('x-robots-tag', 'noindex, nofollow');
      return out;
    }
  } catch {
    /* analytics must never affect the response */
  }
  return res;
}

/* --------------------------- acquisition cookie -------------------------- */

/* Where a conversion came from has to be recorded on the conversion itself.
   The channel is only known on the entry hit, and by the time someone taps the
   phone number they may be three pages deep with an internal referrer — so the
   entry context is stashed in a first-party cookie here and read back by
   /api/pv-event, which the browser sends it to automatically because the
   beacon is same-origin.
   
   Deliberately a session cookie: it lives as long as the visit, carries no
   identifier, and dies when the browser closes. Attributing a call placed days
   after the ad click would need a persistent one — add `Max-Age` here if that
   is ever wanted, but it turns an analytics cookie into a tracking cookie and
   this site has no consent banner. First touch wins: an existing cookie is
   never overwritten, so a visitor who arrives on an ad and later returns from
   a bookmark still attributes to the ad. */
function sourceCookie(context, url, ua, bot) {
  try {
    const req = context.request;
    if (bot || req.method !== 'GET') return null;
    if (isPrivate(url.pathname) || isStatic(url.pathname)) return null;
    if ((req.headers.get('cookie') || '').includes('ts_src=')) return null;   // first touch wins

    const ourHost = url.hostname.replace(/^www\./, '').toLowerCase();
    let refHost = '';
    const ref = req.headers.get('referer') || '';
    if (ref) {
      try {
        refHost = new URL(ref).hostname.replace(/^www\./, '').toLowerCase();
      } catch { /* malformed referrer */ }
    }
    if (refHost === ourHost) return null;   // internal navigation, not an entry

    const gclid =
      url.searchParams.get('gclid') || url.searchParams.get('wbraid') || url.searchParams.get('gbraid');
    const payload = {
      c: classifyChannel(url.searchParams.get('utm_source'), gclid, refHost),
      r: refHost.slice(0, 120),
      g: gclid ? 1 : 0,
      l: url.pathname.slice(0, 200),
      d: deviceOf(ua),
      t: new Date().toISOString(),
      /* The exact campaign, not just the channel it classifies to. "Paid
         Search" tells you the bucket; utm_source/utm_medium tell you which ad
         paid for the call. */
      s: (url.searchParams.get('utm_source') || '').slice(0, 60) || undefined,
      m: (url.searchParams.get('utm_medium') || '').slice(0, 60) || undefined,
    };
    const value = encodeURIComponent(JSON.stringify(payload));
    if (value.length > 1200) return null;
    return `ts_src=${value}; Path=/; HttpOnly; Secure; SameSite=Lax`;
  } catch {
    return null;
  }
}

/* ------------------------------- logging -------------------------------- */

function logPageview(context, url, ua, bot) {
  /* Declared HERE. It was read from onRequest's scope, which is a different
     function — a ReferenceError at request time, silent until it fires. */
  const cf = context.request.cf || {};
  try {
    const req = context.request;
    if (req.method !== 'GET') return;

    const p = url.pathname;
    if (isPrivate(p) || isStatic(p)) return;

    // Only count real document navigations, not prefetches or fetches. Bots
    // rarely send sec-fetch-dest, so they fall through on the accept header.
    const dest = req.headers.get('sec-fetch-dest');
    const accept = req.headers.get('accept') || '';
    const isDoc = dest === 'document' || (dest == null && (accept.includes('text/html') || accept === '*/*' || !accept));
    if (!isDoc) return;

    const ourHost = url.hostname.replace(/^www\./, '').toLowerCase();
    let refHost = '';
    const ref = req.headers.get('referer') || '';
    if (ref) {
      try {
        refHost = new URL(ref).hostname.replace(/^www\./, '').toLowerCase();
      } catch {
        /* malformed referrer */
      }
    }

    // FormSubmit bounces the visitor back to /thank-you/ after a submission.
    // That is our own funnel completing, not a new visit from a new source —
    // counting it as an entry would invent a "formsubmit.co" channel and
    // inflate acquisition with people who were already here.
    const internalRef = refHost === ourHost || refHost.includes('formsubmit.co');

    const isEntry = !internalRef;
    const gclid =
      url.searchParams.get('gclid') || url.searchParams.get('wbraid') || url.searchParams.get('gbraid');
    const utmSource = url.searchParams.get('utm_source');
    const utmMedium = url.searchParams.get('utm_medium');
    const channel = isEntry ? classifyChannel(utmSource, gclid, refHost) : 'Internal';

    const country = context.request.cf?.country || context.request.headers.get('cf-ipcountry') || '';

    const db = context.env?.DB;
    if (!db) return;
    context.waitUntil(
      db
        .prepare(
          `INSERT INTO pageviews
             (path, channel, referrer_host, utm_source, utm_medium, gclid, country, is_entry, is_bot, bot_name, device,
              city, region, metro, isp, asn, ua)
           VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17)`
        )
        .bind(
          p.slice(0, 300),
          channel,
          refHost.slice(0, 120) || null,
          (utmSource || '').slice(0, 80) || null,
          (utmMedium || '').slice(0, 80) || null,
          gclid ? 1 : 0,
          country.slice(0, 4) || null,
          isEntry ? 1 : 0,
          bot ? 1 : 0,
          bot || null,
          bot ? null : deviceOf(ua),
          /* Cloudflare populates all of this at the edge on our plan; the
             country was being kept and the rest thrown away. No IP is stored. */
          (cf.city || '').slice(0, 80) || null,
          (cf.region || '').slice(0, 60) || null,
          (cf.metroCode || '').slice(0, 8) || null,
          (cf.asOrganization || '').slice(0, 80) || null,
          /* asn-ua: the network's number and the user agent (2026-09-25), so a rule decided later can be
             applied to past rows exactly, not by the network's name and the time. Still no IP. */
          Number(cf.asn) || null,
          (ua || '').slice(0, 300) || null
        )
        .run()
        .catch(() => {})
    );
  } catch {
    /* never break a request over analytics */
  }
}

// Map an entry to a marketing channel, most specific first.
function classifyChannel(utmSource, gclid, refHost) {
  if (gclid) return 'Google Ads';
  const s = (utmSource || '').toLowerCase();
  if (s) {
    if (s.includes('google')) return 'Google Ads';
    if (s === 'ig' || s.includes('insta')) return 'Instagram';
    if (s === 'fb' || s.includes('face') || s.includes('meta')) return 'Facebook';
    if (s.includes('bing')) return 'Bing';
    if (s.includes('nextdoor')) return 'Nextdoor';
    return utmSource;
  }
  const h = (refHost || '').toLowerCase();
  if (!h) return 'Direct';
  if (h.includes('google')) return 'Google (organic)';
  if (h.includes('bing')) return 'Bing';
  if (h.includes('duckduckgo')) return 'DuckDuckGo';
  if (h.includes('yahoo')) return 'Yahoo';
  if (h.includes('facebook') || h.startsWith('fb.') || h.includes('instagram')) return 'Facebook/Instagram';
  // Its own bucket on purpose: this is the AI-search work paying off, and it
  // is the one channel a contractor cannot see in any off-the-shelf tool.
  if (
    h.includes('chatgpt') || h.includes('openai') || h.includes('perplexity') ||
    h.includes('claude') || h.includes('anthropic') || h.includes('gemini') ||
    h.includes('copilot') || h.includes('bard')
  ) return 'AI search';
  if (h.includes('nextdoor')) return 'Nextdoor';
  if (h.includes('yelp')) return 'Yelp';
  if (h.includes('bbb.org')) return 'BBB';
  // Industry referrers worth separating out for this client — manufacturer
  // locators, trade directories, anywhere that sends qualified traffic.
  // Add to taste; anything unmatched falls through to the host name.
  // e.g. if (h.includes('houzz.')) return 'Houzz';
  if (h.includes('houzz')) return 'Houzz';
  if (h.includes('angi') || h.includes('homeadvisor')) return 'Angi';
  if (h.includes('t.co') || h.includes('twitter') || h.includes('x.com')) return 'X/Twitter';
  if (h.includes('linkedin')) return 'LinkedIn';
  return h;
}

// Self-contained: a blocked visitor's asset requests would come from the same
// country, so the gate has to render without fetching the stylesheet.
function blockedPage(country) {
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Available in the United States</title>
<style>
  *{box-sizing:border-box;margin:0}
  body{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;
    background:#0b0e0c;color:#fff;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}
  .card{max-width:30rem}
  .tick{font-size:.7rem;letter-spacing:.18em;text-transform:uppercase;color:#43b843;margin-bottom:1rem}
  h1{font-size:clamp(1.6rem,5vw,2.2rem);line-height:1.1;font-weight:500;margin-bottom:.9rem}
  p{color:rgba(255,255,255,.62);line-height:1.65;margin-bottom:.8rem}
  a{color:#43b843;font-weight:600;text-decoration:none}
  .meta{font-size:.68rem;color:rgba(255,255,255,.35);margin-top:1.6rem}
</style></head>
<body><div class="card">
  <p class="tick">Region restricted</p>
  <h1>Chumbley's Detailing works in Nashville, TN.</h1>
  <p>This site isn't available in your region. If you are seeing this in error, call
     <a href="tel:+16156703379">(615) 670-3379</a> and we will sort it out.</p>
  <p class="meta">HTTP 403${country ? ` · detected region ${country}` : ''}</p>
</div></body></html>`;
}
