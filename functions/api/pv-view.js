// POST /api/pv-view — a page view the server never saw.
//
// Chrome fetches some pages before the click: Google's results and ads,
// through Google's own proxy (Private Prefetch Proxy), and the address bar's
// top suggestion. The middleware logs that fetch as "Chrome prefetch", not as
// a visit, because most are never opened. When one is opened, Chrome serves
// its own copy and doesn't ask the server again. So the beacons script (its
// `prefetched-view` block) posts here once, when the page's navigation was
// served from a prefetch or a prerendered copy became the page. This writes
// the page view the middleware would have written, with the person's own
// location instead of the proxy's.
//
// Where the visit came from is read from the ts_src cookie the middleware set
// on the prefetch. Chrome stores a prefetch's cookies only when the person
// opens the page, and before its scripts run. A prefetch through Google's
// proxy never carries cookies, so that cookie was made by this very fetch.
// Without a fresh cookie for this page (a prerender for someone already on
// the site), the page's own address and referrer are classified instead.
//
// Public and same-origin like pv-time and pv-event. A browser's beacon always
// says `Sec-Fetch-Site: same-origin`; a stray cross-site post does not.

/* The entry context the middleware stashed (the same reader as pv-event.js). */
function source(request) {
  try {
    const raw = request.headers.get('cookie') || '';
    const hit = raw.split(';').map((c) => c.trim()).find((c) => c.startsWith('ts_src='));
    if (!hit) return {};
    const v = JSON.parse(decodeURIComponent(hit.slice('ts_src='.length)));
    return {
      channel: typeof v.c === 'string' ? v.c.slice(0, 40) : null,
      referrer: typeof v.r === 'string' && v.r ? v.r.slice(0, 120) : null,
      gclid: v.g ? 1 : 0,
      landing: typeof v.l === 'string' ? v.l.slice(0, 200) : null,
      device: typeof v.d === 'string' ? v.d.slice(0, 12) : null,
      firstSeen: typeof v.t === 'string' ? v.t.slice(0, 40) : null,
      utmSource: typeof v.s === 'string' ? v.s.slice(0, 60) : null,
      utmMedium: typeof v.m === 'string' ? v.m.slice(0, 60) : null,
    };
  } catch {
    return {};
  }
}

function deviceOf(ua) {
  const s = (ua || '').toLowerCase();
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(s)) return 'tablet';
  if (/mobi|iphone|ipod|android|blackberry|windows phone/.test(s)) return 'mobile';
  return 'desktop';
}

/* The middleware's classifyChannel(), coarsely, for the rare view with no
   cookie of its own: a click id, a search engine, another site, nothing. */
function roughChannel(q, refHost, ourHost) {
  if (q.get('gclid') || q.get('wbraid') || q.get('gbraid')) return 'Google Ads';
  if (!refHost) return 'Direct';
  if (refHost === ourHost) return 'Internal';
  if (refHost.includes('google')) return 'Google (organic)';
  if (refHost.includes('bing')) return 'Bing';
  return refHost;
}

/* Chrome keeps a prefetch for about five minutes, so a cookie made for this
   page longer ago than this belongs to an earlier visit. */
const FRESH_MS = 10 * 60 * 1000;

export async function onRequestPost(context) {
  try {
    const req = context.request;
    if ((req.headers.get('sec-fetch-site') || '') !== 'same-origin') return new Response(null, { status: 204 });
    let body = null;
    try {
      body = JSON.parse(await req.text());
    } catch {
      /* malformed beacon, ignore */
    }
    const path = String(body?.p || '').slice(0, 300);
    if (!path.startsWith('/') || path.startsWith('/traffic') || path.startsWith('/api')) {
      return new Response(null, { status: 204 });
    }

    const ua = req.headers.get('user-agent') || '';
    const cf = req.cf || {};
    const ourHost = new URL(req.url).hostname.replace(/^www\./, '').toLowerCase();
    const src = source(req);
    const fresh = src.landing === path && Date.now() - Date.parse(src.firstSeen || '') < FRESH_MS;

    let row;
    if (fresh) {
      row = { channel: src.channel, refHost: src.referrer, utmSource: src.utmSource, utmMedium: src.utmMedium, gclid: src.gclid, entry: 1 };
    } else {
      const q = new URLSearchParams(String(body.q || ''));
      let refHost = '';
      try {
        refHost = new URL(String(body.r || '')).hostname.replace(/^www\./, '').toLowerCase();
      } catch {
        /* no referrer */
      }
      const channel = roughChannel(q, refHost, ourHost);
      row = {
        channel,
        refHost: refHost || null,
        utmSource: (q.get('utm_source') || '').slice(0, 80) || null,
        utmMedium: (q.get('utm_medium') || '').slice(0, 80) || null,
        gclid: q.get('gclid') || q.get('wbraid') || q.get('gbraid') ? 1 : 0,
        entry: channel === 'Internal' ? 0 : 1,
      };
    }

    const db = context.env?.DB;
    if (db) {
      context.waitUntil(
        db
          .prepare(
            `INSERT INTO pageviews
               (path, channel, referrer_host, utm_source, utm_medium, gclid, country, is_entry, is_bot, bot_name, device,
                city, region, metro, isp)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,0,NULL,?9,?10,?11,?12,?13)`
          )
          .bind(
            path,
            row.channel || null,
            (row.refHost || '').slice(0, 120) || null,
            row.utmSource || null,
            row.utmMedium || null,
            row.gclid ? 1 : 0,
            (cf.country || '').slice(0, 4) || null,
            row.entry,
            deviceOf(ua),
            (cf.city || '').slice(0, 80) || null,
            (cf.region || '').slice(0, 60) || null,
            (cf.metroCode || '').slice(0, 8) || null,
            (cf.asOrganization || '').slice(0, 80) || null
          )
          .run()
          .catch(() => {})
      );
    }
  } catch {
    /* never surface an error to a beacon */
  }
  return new Response(null, { status: 204 });
}

export function onRequestGet() {
  return new Response(null, { status: 204 });
}
