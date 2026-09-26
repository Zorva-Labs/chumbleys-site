// POST /api/pv-event — conversion beacon.
//
// Without something here, /traffic would only ever show visits, and a traffic
// number with no conversion beside it is a vanity metric.
//
// For most local businesses a lead is a phone call rather than a form, so
// tap-to-call is the headline event, not an afterthought. Public and
// same-origin for the same reason as pv-time: nothing for a blocker to match
// on.

const ALLOWED = new Set(['call', 'email', 'form_submit', 'form_complete', 'directions']);

/* The entry context the edge middleware stashed on this visitor's first hit.
   It rides along with this POST for free because the beacon is same-origin,
   which is how a conversion three pages deep still knows it came from an ad. */
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

/* The browser and platform, from the same user-agent the page view already
   reads. Coarse on purpose: the version numbers change weekly, tell a business
   owner nothing, and make the string more identifying than it needs to be. */
function browserOf(ua) {
  const s = (ua || '');
  if (/\bEdg\//.test(s)) return 'Edge';
  if (/\bOPR\/|\bOpera\b/.test(s)) return 'Opera';
  if (/\bSamsungBrowser\//.test(s)) return 'Samsung Internet';
  if (/\bFirefox\//.test(s)) return 'Firefox';
  if (/\bCriOS\//.test(s)) return 'Chrome (iOS)';
  if (/\bChrome\//.test(s)) return 'Chrome';
  if (/\bSafari\//.test(s)) return 'Safari';
  return null;
}
function osOf(ua) {
  const s = (ua || '');
  if (/\bWindows NT\b/.test(s)) return 'Windows';
  if (/\biPhone\b|\biPad\b|\biPod\b/.test(s)) return 'iOS';
  if (/\bMac OS X\b/.test(s)) return 'macOS';
  if (/\bAndroid\b/.test(s)) return 'Android';
  if (/\bCrOS\b/.test(s)) return 'ChromeOS';
  if (/\bLinux\b/.test(s)) return 'Linux';
  return null;
}

// lead-proof: a thank-you page load is a sent form only when a saved lead is waiting for it
/* The thank-you page reports form_complete every time it loads, and a load is
   not always a form: a reload, a tab restored days later, someone typing the
   address, another site's form sending people on. On Three Stone (2026-09-25)
   a browser that had loaded nothing else on the site opened /thank-you/, most
   likely from the old WordPress site that stale DNS still reached, and the
   dashboard listed a sent form with no name and no source. Where the site's
   own form saves every submission to `leads` before it sends the visitor on,
   that row is the proof: form_complete stands while a lead saved in the last
   two minutes has no form_complete yet (the dashboard's name match uses the
   same two minutes, one lead to one event), and anything else is logged as
   `thankyou_view`, which no count reads. A site with no `leads` table can't
   tell, and a failed lookup proves nothing, so both keep form_complete.
   julianday() reads the lead's time whichever way the form wrote it. */
async function formProof(db, name) {
  if (name !== 'form_complete') return name;
  try {
    const r = await db.prepare(
      `SELECT (SELECT COUNT(*) FROM leads WHERE julianday(created_at) >= julianday('now', '-120 seconds'))
            - (SELECT COUNT(*) FROM events WHERE name = 'form_complete' AND created_at >= datetime('now', '-120 seconds')) AS open`
    ).first();
    return !r || Number(r.open) > 0 ? name : 'thankyou_view';
  } catch {
    return name;
  }
}
// /lead-proof

export async function onRequestPost(context) {
  try {
    const cf = context.request.cf || {};
    const ua = context.request.headers.get('user-agent') || '';
    const raw = await context.request.text().catch(() => '');
    let body = null;
    try {
      body = JSON.parse(raw);
    } catch {
      /* malformed beacon, ignore */
    }
    if (!body) return new Response(null, { status: 204 });

    const name = String(body.n || '').slice(0, 30);
    if (!ALLOWED.has(name)) return new Response(null, { status: 204 });

    const path = String(body.p || '').slice(0, 300) || null;
    if (path && (path.startsWith('/traffic') || path.startsWith('/api'))) {
      return new Response(null, { status: 204 });
    }
    const detail = body.d ? String(body.d).slice(0, 160) : null;
    const country = context.request.cf?.country || '';
    const src = source(context.request);

    const db = context.env?.DB;
    if (db) {
      context.waitUntil(
        formProof(db, name).then((kind) => db
          .prepare(
            `INSERT INTO events
               (name, path, detail, country, channel, referrer_host, gclid, landing, device, first_seen,
                city, region, postal, metro, timezone, isp, asn, browser, os, language,
                utm_source, utm_medium)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22)`
          )
          .bind(
            kind,
            path,
            detail,
            country.slice(0, 4) || null,
            src.channel || null,
            src.referrer || null,
            src.gclid || 0,
            src.landing || null,
            src.device || null,
            src.firstSeen || null,
            /* Everything the edge knows at the moment of the conversion. This
               POST is same-origin, so request.cf is populated exactly as it is
               for a page view — no client-side collection, nothing a blocker
               can intercept. No IP is stored. */
            (cf.city || '').slice(0, 80) || null,
            (cf.region || '').slice(0, 60) || null,
            (cf.postalCode || '').slice(0, 12) || null,
            (cf.metroCode || '').slice(0, 8) || null,
            (cf.timezone || '').slice(0, 40) || null,
            (cf.asOrganization || '').slice(0, 80) || null,
            Number(cf.asn) || null,
            browserOf(ua),
            osOf(ua),
            (context.request.headers.get('accept-language') || '').split(',')[0].slice(0, 12) || null,
            src.utmSource || null,
            src.utmMedium || null
          )
          .run())
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
