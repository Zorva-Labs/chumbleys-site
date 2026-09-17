// Single-password session for /traffic.
//
// There is no CRM on this site, so the dashboard carries its own minimal auth
// rather than borrowing one. The design goals are narrow and worth stating:
//
//   - No user table, no password reset flow, nothing to maintain. One shared
//     secret (TRAFFIC_PASSWORD, a Pages secret) that we hand to the client.
//   - The cookie is a signed, expiring token — not the password. Signing key
//     is derived from the password itself, so rotating the password
//     invalidates every live session for free.
//   - Constant-time comparison, because a timing oracle on a short password is
//     a real (if unglamorous) way to lose an admin surface.

const COOKIE = 'ts_traffic';
const TTL_SECONDS = 60 * 60 * 24 * 14; // two weeks

const enc = new TextEncoder();

const b64url = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function signingKey(password) {
  // Derive the HMAC key from the password so there is only one secret to
  // manage, and changing it logs everyone out.
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(`chumbleys-traffic:${password}`));
  return crypto.subtle.importKey('raw', digest, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

async function sign(password, payload) {
  const key = await signingKey(password);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(payload)));
}

// Length-independent equality. Compare digests rather than the raw strings so
// an attacker cannot learn the password length from response timing either.
async function safeEqual(a, b) {
  const [da, db] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(String(a))),
    crypto.subtle.digest('SHA-256', enc.encode(String(b))),
  ]);
  const x = new Uint8Array(da);
  const y = new Uint8Array(db);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

export async function checkPassword(env, supplied) {
  const expected = env?.TRAFFIC_PASSWORD;
  // No password configured means the dashboard is closed, not open. Failing
  // shut is the only safe default for an admin surface.
  if (!expected) return false;
  if (!supplied) return false;
  return safeEqual(supplied, expected);
}

export async function issueCookie(env) {
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const payload = String(exp);
  const mac = await sign(env.TRAFFIC_PASSWORD, payload);
  const value = `${payload}.${mac}`;
  return `${COOKIE}=${value}; Path=/; Max-Age=${TTL_SECONDS}; Secure; HttpOnly; SameSite=Lax`;
}

export const clearCookie = () => `${COOKIE}=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax`;

export async function hasSession(request, env) {
  try {
    if (!env?.TRAFFIC_PASSWORD) return false;
    const raw = request.headers.get('Cookie') || '';
    const hit = raw.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${COOKIE}=`));
    if (!hit) return false;

    const value = hit.slice(COOKIE.length + 1);
    const dot = value.lastIndexOf('.');
    if (dot < 1) return false;

    const payload = value.slice(0, dot);
    const mac = value.slice(dot + 1);

    const expected = await sign(env.TRAFFIC_PASSWORD, payload);
    if (!(await safeEqual(mac, expected))) return false;

    const exp = parseInt(payload, 10);
    return Number.isFinite(exp) && exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
      ...extra,
    },
  });
