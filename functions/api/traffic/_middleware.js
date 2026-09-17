// Auth gate for every /api/traffic/* endpoint except the login route.
//
// Living in a _middleware.js beside the endpoints means any file added to this
// directory later is protected by default. Forgetting a check is the usual way
// an admin API leaks, so the safe state is the one you get for free.

import { hasSession, json } from '../../_lib/auth.js';

export async function onRequest(context) {
  const { request, env, next, data } = context;
  const url = new URL(request.url);

  // The auth endpoint handles its own login/logout flow.
  if (url.pathname === '/api/traffic/auth') return next();

  if (!env?.TRAFFIC_PASSWORD) {
    return json({ ok: false, error: 'No traffic password is configured on this deployment.' }, 503);
  }
  if (!(await hasSession(request, env))) {
    return json({ ok: false, error: 'Not signed in.' }, 401);
  }

  const db = env.DB;
  if (!db) return json({ ok: false, error: 'Analytics database is not bound on this deployment.' }, 500);
  data.db = db;

  const res = await next();
  const headers = new Headers(res.headers);
  headers.set('cache-control', 'no-store');
  headers.set('x-robots-tag', 'noindex, nofollow');
  return new Response(res.body, { status: res.status, headers });
}
