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
  for (const [needle, name] of BOTS) if (s.includes(needle)) return name;
  return null;
}

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

/* -------------------------------- handler ------------------------------- */

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const ua = request.headers.get('user-agent') || '';
  const bot = botName(ua);

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
      logPageview(context, url, ua, bot);
      const cookie = sourceCookie(context, url, ua, bot);
      if (cookie) {
        const out = new Response(res.body, res);
        out.headers.append('set-cookie', cookie);
        return out;
      }
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
              city, region, metro, isp)
           VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15)`
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
          (cf.asOrganization || '').slice(0, 80) || null
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
