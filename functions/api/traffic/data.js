// GET /api/traffic/data?days=N
//
// Everything the dashboard renders, in one round trip.
//
// The numbers come from our own D1 log, written by the edge middleware before
// any browser script runs. That matters more than it sounds: Google Analytics
// depends on the visitor loading google-analytics.com, which a meaningful
// share of people block outright, so GA typically reports 20-40% low. Nothing
// here can be blocked, because there is nothing for a blocker to recognize.
//
// Cloudflare's own edge analytics is queried too when a zone is configured. It
// counts every request including static assets and blocked traffic, so it is
// the upper bound rather than a like-for-like comparison. The dashboard says
// which is which instead of quietly picking one.

// Hours behind UTC for the client's local time. Central = 5, Eastern = 4,
// Mountain = 6, Pacific = 7. DST-unaware by design: it is off by an hour for
// part of the year, which does not change any decision this page informs.
/* STD is this site's STANDARD offset in hours behind UTC — Central 6, Eastern
   5, Mountain 7, Pacific 8. Not the daylight one: the daylight offset is what
   this file used to be given, and it is wrong for the four winter months.
 *
 * The offset is worked out from the US daylight-saving rule rather than looked
 * up, because the Workers runtime has no named time zones —
 * Intl.DateTimeFormat({timeZone:'America/Chicago'}) THROWS there, and a
 * try/catch around it silently returns the fallback, which is how a dashboard
 * came to report UTC-6 in August. Since 2007 the rule has been fixed: second
 * Sunday in March 02:00 local standard, back the first Sunday in November
 * 02:00 local daylight. */
const TZ_STANDARD = 6;

function nthSunday(year, month, n) {
  const dow = new Date(Date.UTC(year, month, 1)).getUTCDay();
  return 1 + ((7 - dow) % 7) + (n - 1) * 7;
}
function localOffset(std, when = new Date()) {
  const y = when.getUTCFullYear();
  const start = Date.UTC(y, 2, nthSunday(y, 2, 2), 2 + std);
  const end = Date.UTC(y, 10, nthSunday(y, 10, 1), 2 + std - 1);
  const t = when.getTime();
  return t >= start && t < end ? std - 1 : std;
}

/* Cloudflare GraphQL auth for the edge panel. CF_ANALYTICS_TOKEN (an API
   token, Bearer) since 2026-09-24 — the global key behind CF_ANALYTICS_EMAIL
   + CF_ANALYTICS_KEY stopped authenticating on 2026-09-23; the pair stays as
   the fallback. */
function cfAnalyticsAuth(env) {
  return env.CF_ANALYTICS_TOKEN
    ? { Authorization: `Bearer ${env.CF_ANALYTICS_TOKEN}` }
    : { 'X-Auth-Email': env.CF_ANALYTICS_EMAIL, 'X-Auth-Key': env.CF_ANALYTICS_KEY };
}
const cfAnalyticsConfigured = (env) =>
  !!((env.CF_ANALYTICS_TOKEN || (env.CF_ANALYTICS_EMAIL && env.CF_ANALYTICS_KEY)) && env.CF_ZONE_ID);

async function cfGraphQL(env, query) {
  const r = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: {
      ...cfAnalyticsAuth(env),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  return r.json().catch(() => ({}));
}

/* ------------------------------- rankings -------------------------------- */

/* Written weekly by the gsc-ingest Worker from Search Console. Everything else
   on this dashboard is live to the second; this is not, and the UI says so —
   Search Console lags about three days and this is collected once a week.
   Presenting the two at the same apparent freshness would be the misleading
   part, not the lag itself.
 
   Returns null when the tables are absent, which is the honest answer for a
   site that has not been added to gsc-ingest yet. A dashboard that renders an
   empty rankings panel is indistinguishable from one whose pipeline is broken. */
/* ------------------------------- analytics -------------------------------- */
/* Google Analytics, pushed into THIS site's D1 by the central ingest. The same
   shape and the same containment as rankings() below.

   Returns null when the table is absent, which is the honest answer for a site
   whose ingest has not run. The panel says so rather than showing three zeroes
   — no pipeline and no traffic look identical otherwise, and only one of them
   is a problem. */
async function analytics(db) {
  const meta = await db
    .prepare("SELECT value FROM ga4_meta WHERE key = 'measurement_id'")
    .first()
    .catch(() => null);
  if (!meta) return null;

  const asOf = await db.prepare('SELECT MAX(day) AS d FROM ga4_days').first().catch(() => null);
  const days = (await db.prepare(
    'SELECT day, sessions, users, views FROM ga4_days ORDER BY day').all().catch(() => ({}))).results || [];
  const channels = (await db.prepare(
    'SELECT channel, SUM(sessions) AS sessions FROM ga4_channels GROUP BY channel ORDER BY sessions DESC'
  ).all().catch(() => ({}))).results || [];

  return { measurementId: meta.value, asOf: asOf && asOf.d, days, channels };
}

async function rankings(db) {
  const latest = await db
    .prepare('SELECT MAX(week_start) AS w FROM rank_snapshots')
    .first()
    .catch(() => null);
  if (!latest) return null;                       // tables not installed
  const week = latest.w;

  const meta = Object.fromEntries(
    ((await db.prepare('SELECT key, value FROM rank_meta').all()).results || [])
      .map((r) => [r.key, r.value])
  );
  /* Target keywords: the searches we have set out to win for this site.
     LEFT JOIN on purpose — Search Console reports nothing at all for a term the
     site does not rank for, not a position, so a null here means "not ranking
     yet", which is the honest answer and the one worth showing. Queried before
     the early return so a brand-new site with a target list still shows it,
     which is exactly when that list is most useful. */
  const watch = ((await db.prepare(
    `SELECT w.label, w.query, w.note, s.position, s.impressions, s.clicks,
            b.position AS was
       FROM rank_watch w
       LEFT JOIN rank_snapshots s ON s.query = w.query AND s.week_start = ?1
       LEFT JOIN rank_baseline  b ON b.query = w.query
      ORDER BY (s.position IS NULL), s.position`
  ).bind(week || '').all().catch(() => ({ results: [] }))).results || []);

  if (!week) return { installed: true, week: null, meta, watch, trend: [] };

  const [trend, movement, top, striking, fresh, pages] = await Promise.all([
    /* The headline chart. Deliberately buckets, not average position: average
       position gets WORSE as a site succeeds, because newly earned long-tail
       keywords enter around 40 and drag the mean down. A client watching that
       number panics in month three, exactly when the work starts landing. */
    db.prepare(
      `SELECT week_start,
              SUM(CASE WHEN position <= 3 THEN 1 ELSE 0 END)  AS top3,
              SUM(CASE WHEN position >  3 AND position <= 10 THEN 1 ELSE 0 END) AS top10,
              SUM(CASE WHEN position > 10 AND position <= 20 THEN 1 ELSE 0 END) AS top20,
              SUM(CASE WHEN position > 20 THEN 1 ELSE 0 END)  AS rest,
              COUNT(*) AS total, SUM(impressions) AS impressions, SUM(clicks) AS clicks
         FROM rank_snapshots GROUP BY week_start ORDER BY week_start DESC LIMIT 26`
    ).all(),

    /* Wins and losses in one list, sorted by movement. Showing only the
       winners is the fastest way to make a real result look fabricated. */
    db.prepare(
      `SELECT s.query, s.position AS now, b.position AS was, b.week_start AS since,
              s.impressions, s.clicks
         FROM rank_snapshots s JOIN rank_baseline b ON b.query = s.query
        WHERE s.week_start = ?1 AND b.week_start < ?1
        ORDER BY (b.position - s.position) DESC LIMIT 30`
    ).bind(week).all(),

    db.prepare(
      `SELECT query, position, impressions, clicks FROM rank_snapshots
        WHERE week_start = ?1 ORDER BY impressions DESC LIMIT 25`
    ).bind(week).all(),

    /* Positions 4-20 with real volume: close enough to page one to be worth
       the next month's work, which is what turns the report from a receipt
       into a reason to keep going. */
    db.prepare(
      `SELECT query, position, impressions FROM rank_snapshots
        WHERE week_start = ?1 AND position > 3 AND position <= 20 AND impressions >= 3
        ORDER BY impressions DESC LIMIT 15`
    ).bind(week).all(),

    /* First seen this week — terms nobody predicted. */
    db.prepare(
      `SELECT query, position, impressions FROM rank_baseline
        WHERE week_start = ?1 ORDER BY impressions DESC LIMIT 15`
    ).bind(week).all(),

    db.prepare(
      `SELECT page, COUNT(*) AS queries, SUM(impressions) AS impressions,
              SUM(clicks) AS clicks, MIN(position) AS best
         FROM rank_pages WHERE week_start = ?1
        GROUP BY page ORDER BY clicks DESC, impressions DESC LIMIT 20`
    ).bind(week).all(),
  ]);

  /* rank_pages holds absolute URLs from Google; the events table holds paths.
     Normalizing here rather than in SQL keeps the trailing-slash handling in
     one readable place — Google reports /roofing/ where the site logs
     /roofing, and an unmatched pair silently drops the most valuable row on
     the page. */
  const pathOf = (url) => {
    try { return new URL(url).pathname.replace(/\/+$/, '') || '/'; }
    catch { return String(url || '').replace(/\/+$/, '') || '/'; }
  };
  const topQueryByPage = new Map();
  for (const r of (await db.prepare(
    `SELECT page, query, position, impressions FROM rank_pages
      WHERE week_start = ?1 ORDER BY impressions DESC`
  ).bind(week).all()).results || []) {
    const k = pathOf(r.page);
    if (!topQueryByPage.has(k)) topQueryByPage.set(k, { query: r.query, position: r.position });
  }

  /* The money list. `top` is ordered by impressions, which is the right way to
     show reach but buries the handful of terms that did the work — a query
     shown 900 times with no clicks outranks one shown 40 times that brought 11
     people. So this gets its own panel and its own ordering. */
  const clicked = await db.prepare(
    `SELECT query, position, impressions, clicks
       FROM rank_snapshots
      WHERE week_start = ?1 AND clicks > 0
      ORDER BY clicks DESC, impressions DESC LIMIT 25`
  ).bind(week).all().catch(() => ({ results: [] }));

  return {
    installed: true,
    week,
    meta,
    watch,
    clicked: clicked.results || [],
    trend: (trend.results || []).reverse(),
    movement: movement.results || [],
    top: top.results || [],
    striking: striking.results || [],
    fresh: fresh.results || [],
    pages: (pages.results || []).map((p) => ({ ...p, path: pathOf(p.page) })),
    /* Keyed by path so the client can line these up against conversion pages
       without a second round trip. */
    queryByPath: Object.fromEntries(topQueryByPage),
  };
}

export async function onRequestGet({ request, env, data }) {
  /* Per request. At module scope the Workers clock is frozen at the epoch,
     so the DST test runs against 1970 and always returns standard time. */
  const CT_OFFSET = localOffset(TZ_STANDARD);
  const db = data.db;
  const url = new URL(request.url);

  let days = parseInt(url.searchParams.get('days') || '30', 10);
  if (!Number.isFinite(days) || days < 1) days = 30;
  days = Math.min(days, 365);
  const since = `-${days} day`;
  // The window immediately before this one, same length — so a tile can say
  // "up 22% on the previous 30 days" rather than leaving a number with no
  // direction attached to it.
  const prevStart = `-${days * 2} day`;

  const q = (sql, ...binds) =>
    db.prepare(sql).bind(...binds).all().then((r) => r.results || []).catch(() => []);

  // Local-day and local-hour expressions. D1 stores UTC, so an evening visit
  // lands on the next UTC day. Bucketing on raw UTC would put a good slice of
  // every evening on the wrong date.
  const localDay = `date(created_at, '-${CT_OFFSET} hours')`;
  const localHour = `CAST(strftime('%H', created_at, '-${CT_OFFSET} hours') AS INTEGER)`;

  // "Human" excludes crawlers. Every panel that describes an audience filters
  // on it; the crawler panel deliberately does not.
  const HUMAN = 'is_bot = 0';

  const [
    daily, topPages, channels, entryPages, countries,
    engagement, totals, hours, devices, bots, botTotals, referrers, prevTotals,
  ] = await Promise.all([
    q(`SELECT ${localDay} AS day, COUNT(*) AS views,
              SUM(CASE WHEN is_entry = 1 THEN 1 ELSE 0 END) AS entries
         FROM pageviews WHERE created_at >= datetime('now', ?1) AND ${HUMAN}
        GROUP BY day ORDER BY day ASC`, since),
    q(`SELECT path, COUNT(*) AS views
         FROM pageviews WHERE created_at >= datetime('now', ?1) AND ${HUMAN}
        GROUP BY path ORDER BY views DESC LIMIT 15`, since),
    q(`SELECT channel, COUNT(*) AS n
         FROM pageviews WHERE created_at >= datetime('now', ?1) AND ${HUMAN} AND is_entry = 1
        GROUP BY channel ORDER BY n DESC LIMIT 15`, since),
    q(`SELECT path, COUNT(*) AS n
         FROM pageviews WHERE created_at >= datetime('now', ?1) AND ${HUMAN} AND is_entry = 1
        GROUP BY path ORDER BY n DESC LIMIT 12`, since),
    q(`SELECT country, COUNT(*) AS n
         FROM pageviews WHERE created_at >= datetime('now', ?1) AND ${HUMAN} AND country IS NOT NULL
        GROUP BY country ORDER BY n DESC LIMIT 12`, since),
    q(`SELECT path, COUNT(*) AS samples, ROUND(AVG(seconds)) AS avg_seconds, MAX(seconds) AS max_seconds
         FROM page_engagement WHERE created_at >= datetime('now', ?1)
        GROUP BY path HAVING samples >= 2 ORDER BY avg_seconds DESC LIMIT 12`, since),
    // COALESCE because SUM() over no rows is NULL, and a brand-new site would
    // otherwise render an em-dash where it should read zero.
    q(`SELECT COUNT(*) AS views,
              COALESCE(SUM(CASE WHEN is_entry = 1 THEN 1 ELSE 0 END), 0) AS entries,
              COALESCE(SUM(gclid), 0) AS ad_clicks
         FROM pageviews WHERE created_at >= datetime('now', ?1) AND ${HUMAN}`, since),
    q(`SELECT ${localHour} AS hour, COUNT(*) AS n
         FROM pageviews WHERE created_at >= datetime('now', ?1) AND ${HUMAN}
        GROUP BY hour ORDER BY hour ASC`, since),
    q(`SELECT device, COUNT(*) AS n
         FROM pageviews WHERE created_at >= datetime('now', ?1) AND ${HUMAN} AND device IS NOT NULL
        GROUP BY device ORDER BY n DESC`, since),
    // Crawlers, kept separate on purpose. Seeing GPTBot, ClaudeBot and
    // PerplexityBot in this list is the only direct evidence that the AEO/GEO
    // work is landing — no off-the-shelf analytics tool will show it.
    q(`SELECT bot_name AS name, COUNT(*) AS n, MAX(created_at) AS last_seen
         FROM pageviews WHERE created_at >= datetime('now', ?1) AND is_bot = 1 AND bot_name IS NOT NULL
        GROUP BY bot_name ORDER BY n DESC LIMIT 20`, since),
    q(`SELECT COUNT(*) AS n FROM pageviews WHERE created_at >= datetime('now', ?1) AND is_bot = 1`, since),
    q(`SELECT referrer_host AS host, COUNT(*) AS n
         FROM pageviews
        WHERE created_at >= datetime('now', ?1) AND ${HUMAN} AND is_entry = 1
          AND referrer_host IS NOT NULL AND referrer_host <> ''
        GROUP BY host ORDER BY n DESC LIMIT 12`, since),
    q(`SELECT COUNT(*) AS views,
              COALESCE(SUM(CASE WHEN is_entry = 1 THEN 1 ELSE 0 END), 0) AS entries
         FROM pageviews
        WHERE created_at >= datetime('now', ?1) AND created_at < datetime('now', ?2)
          AND ${HUMAN}`, prevStart, since),
  ]);

  /* ---- Conversions ------------------------------------------------------ */
  /* No CRM here, so this is where "did the traffic do anything" lives. Calls
     matter most: for most local businesses a lead starts with a phone call,
     not a form. */

  const [eventTotals, eventDaily, eventPages, eventRecent, eventChannels, eventHours, prevConv] =
    await Promise.all([
    q(`SELECT name, COUNT(*) AS n
         FROM events WHERE created_at >= datetime('now', ?1)
        GROUP BY name ORDER BY n DESC`, since),
    q(`SELECT ${localDay} AS day, COUNT(*) AS n
         FROM events WHERE created_at >= datetime('now', ?1) AND name IN ('call','form_complete')
        GROUP BY day ORDER BY day ASC`, since),
    q(`SELECT path, COUNT(*) AS n
         FROM events WHERE created_at >= datetime('now', ?1) AND name IN ('call','form_complete')
          AND path IS NOT NULL
        GROUP BY path ORDER BY n DESC LIMIT 12`, since),
    /* The conversions themselves, newest first — a log rather than a total, so
       you can see the ad click that turned into a phone call at 4:12pm. Times
       come back pre-shifted to Central; minutes_to_convert is how long the
       visit ran before they acted. */
    q(`SELECT id, name, path, detail, country, channel, referrer_host, gclid,
              landing, device,
              postal, metro, timezone, browser, os, language,
              utm_source, utm_medium,
              datetime(created_at, '-${CT_OFFSET} hours') AS local_time,
              CASE WHEN first_seen IS NULL THEN NULL
                   ELSE CAST((julianday(created_at) - julianday(first_seen)) * 1440 AS INTEGER)
              END AS minutes_to_convert
         FROM events
        WHERE created_at >= datetime('now', ?1)
        ORDER BY created_at DESC LIMIT 200`, since),
    q(`SELECT COALESCE(channel, 'Unknown') AS channel, COUNT(*) AS n
         FROM events
        WHERE created_at >= datetime('now', ?1) AND name IN ('call','form_complete')
        GROUP BY channel ORDER BY n DESC`, since),
    /* When the phone actually rings, which is not the same as when people
       browse — it is a staffing question, so it gets its own hour buckets. */
    q(`SELECT ${localHour} AS hour, COUNT(*) AS n
         FROM events
        WHERE created_at >= datetime('now', ?1) AND name IN ('call','form_complete')
        GROUP BY hour ORDER BY hour ASC`, since),
    q(`SELECT COUNT(*) AS n FROM events
        WHERE created_at >= datetime('now', ?1) AND created_at < datetime('now', ?2)
          AND name IN ('call','form_complete')`, prevStart, since),
  ]);

  const byName = Object.fromEntries(eventTotals.map((r) => [r.name, r.n]));
  const conversions = (byName.call || 0) + (byName.form_complete || 0);

  /* ---- Cloudflare edge --------------------------------------------------- */

  let edge = { configured: false, days: [], totals: null };
  if (cfAnalyticsConfigured(env)) {
    const DAY = 86400000;
    const now = new Date();
    const iso = (d) => d.toISOString().slice(0, 10);
    // httpRequests1dGroups is capped well below a year on the free plan; ask
    // for at most 30 days so a wider D1 window does not error the whole call.
    const span = Math.min(days, 30);
    const start = iso(new Date(now.getTime() - span * DAY));

    const query = `query { viewer { zones(filter: {zoneTag: "${env.CF_ZONE_ID}"}) {
      httpRequests1dGroups(limit: 31, filter: {date_geq: "${start}", date_leq: "${iso(now)}"}, orderBy: [date_ASC]) {
        dimensions { date }
        sum { pageViews requests }
        uniq { uniques }
      }
    } } }`;

    try {
      const res = await cfGraphQL(env, query);
      const groups = res?.data?.viewer?.zones?.[0]?.httpRequests1dGroups;
      if (Array.isArray(groups)) {
        edge = {
          configured: true,
          days: groups.map((g) => ({
            day: g.dimensions.date,
            pageViews: g.sum.pageViews,
            requests: g.sum.requests,
            uniques: g.uniq.uniques,
          })),
        };
        edge.totals = edge.days.reduce(
          (a, d) => ({
            pageViews: a.pageViews + d.pageViews,
            requests: a.requests + d.requests,
            uniques: a.uniques + d.uniques,
          }),
          { pageViews: 0, requests: 0, uniques: 0 }
        );
      } else {
        edge.error = res?.errors?.[0]?.message || 'no data returned';
      }
    } catch (err) {
      edge.error = String(err?.message || err).slice(0, 200);
    }
  }

  /* Never let a rankings failure take down the traffic dashboard: this data is
     a weekly addition to a page whose core job is live first-party analytics. */
  let rank = null;
  try { rank = await rankings(db); } catch { rank = null; }
  /* Same containment: a weekly side-channel must never take down the page
     whose own numbers are already in hand. */
  let ga = null;
  try { ga = await analytics(db); } catch { ga = null; }

  return new Response(
    JSON.stringify({
      ok: true,
      days,
      generatedAt: new Date().toISOString(),
      timezone: `UTC-${CT_OFFSET} (Central)`,
      geoGate: String(env.GEO_ALLOW || '') || null,
      firstParty: {
        totals: totals[0] || { views: 0, entries: 0, ad_clicks: 0 },
        previous: prevTotals[0] || { views: 0, entries: 0 },
        daily, topPages, channels, entryPages, countries,
        engagement, hours, devices, referrers,
      },
      crawlers: { total: botTotals[0]?.n || 0, list: bots },
      conversions: {
        total: conversions, byName, daily: eventDaily, pages: eventPages,
        recent: eventRecent, channels: eventChannels, hours: eventHours,
        previous: prevConv[0]?.n || 0,
        /* Whether this site has a thank-you step AT ALL, all-time. A form that
           confirms in place never navigates, so form_complete cannot fire and
           its absence is not a lost lead — without this the funnel accuses a
           form that is working perfectly. Deliberately not windowed: a site
           that HAS a thank-you page but lost every submission this week must
           still raise the alarm. */
        hasThankYou: ((await db.prepare(
          "SELECT COUNT(*) AS n FROM events WHERE name = 'form_complete'"
        ).first().catch(() => null))?.n || 0) > 0,
      },
      edge,
      rankings: rank,
      ga4: ga,
    }),
    { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } }
  );
}
