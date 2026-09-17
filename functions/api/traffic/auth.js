// /api/traffic/auth — sign in, sign out, and report session state.
//
// GET    → { ok, signedIn, configured }
// POST   → { password } → sets the session cookie
// DELETE → clears it

import { checkPassword, issueCookie, clearCookie, hasSession, json } from '../../_lib/auth.js';

export async function onRequestGet({ request, env }) {
  return json({
    ok: true,
    configured: Boolean(env?.TRAFFIC_PASSWORD),
    signedIn: await hasSession(request, env),
  });
}

export async function onRequestPost({ request, env }) {
  if (!env?.TRAFFIC_PASSWORD) {
    return json({ ok: false, error: 'No traffic password is configured on this deployment.' }, 503);
  }

  let body = null;
  try {
    body = await request.json();
  } catch {
    /* fall through to the generic failure below */
  }

  if (!(await checkPassword(env, body?.password))) {
    // One deliberate second of delay. It is imperceptible to a person typing a
    // password and makes an online guessing run against a shared secret
    // impractical without any state to keep.
    await new Promise((r) => setTimeout(r, 1000));
    return json({ ok: false, error: 'That password is not right.' }, 401);
  }

  return json({ ok: true }, 200, { 'set-cookie': await issueCookie(env) });
}

export function onRequestDelete() {
  return json({ ok: true }, 200, { 'set-cookie': clearCookie() });
}
