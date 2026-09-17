// POST /api/pv-time — first-party engagement beacon, sent by assets/js/main.js.
//
// Records how many *active* seconds a visitor spent on a page. Public and
// unauthenticated because it is a visitor beacon, and same-origin so ad
// blockers have nothing to match against. Always answers 204 — sendBeacon
// discards the body, and a beacon should never produce a visible error.

export async function onRequestPost(context) {
  try {
    const raw = await context.request.text().catch(() => '');
    let body = null;
    try {
      body = JSON.parse(raw);
    } catch {
      /* malformed beacon, ignore */
    }
    if (!body) return new Response(null, { status: 204 });

    const path = String(body.p || '').slice(0, 300);
    const secs = parseInt(body.s, 10);
    const pvid = String(body.id || '').slice(0, 40) || null;

    // Never record time on the dashboard or the API.
    if (!path || path.startsWith('/traffic') || path.startsWith('/api')) {
      return new Response(null, { status: 204 });
    }
    // Bound the value: under a second is noise, over an hour is a forgotten tab.
    if (!Number.isFinite(secs) || secs < 1 || secs > 3600) return new Response(null, { status: 204 });

    const country = context.request.cf?.country || '';
    const db = context.env?.DB;
    if (db && pvid) {
      // The beacon reports a running total several times per visit. Keep the
      // largest for each page view, so an early "tab hidden" report cannot
      // undercount somebody who then stayed and read the page.
      context.waitUntil(
        db
          .prepare(
            `INSERT INTO page_engagement (pvid, path, seconds, country) VALUES (?1,?2,?3,?4)
             ON CONFLICT(pvid) DO UPDATE SET seconds = excluded.seconds
             WHERE excluded.seconds > page_engagement.seconds`
          )
          .bind(pvid, path, secs, country.slice(0, 4) || null)
          .run()
          .catch(() => {})
      );
    }
  } catch {
    /* never surface an error to a beacon */
  }
  return new Response(null, { status: 204 });
}

// A quiet GET so an accidental navigation does not 404 noisily.
export function onRequestGet() {
  return new Response(null, { status: 204 });
}
