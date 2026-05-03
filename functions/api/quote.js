/**
 * Cloudflare Pages Function — handles quote form submissions for Chumbley's.
 *
 * Two side-effects:
 *   1. Sends the lead via Resend to the client's inbox.
 *   2. Fires a `generate_lead` conversion to GA4 via the Measurement
 *      Protocol — server-side, so it can't be blocked by ad blockers,
 *      consent mode, or browser quirks the way client-side gtag is.
 *
 * Required env vars:
 *   RESEND_API_KEY      — Resend API key (sending access)
 *
 * Optional env vars:
 *   QUOTE_TO            — destination email (default: chumbleysdetailing@gmail.com)
 *   QUOTE_FROM          — sender display + address (default uses onboarding@resend.dev)
 *   GA4_MEASUREMENT_ID  — e.g. "G-ZM8FXXENGY"
 *   GA4_API_SECRET      — created in GA4 Admin → Data Streams → Web →
 *                          Measurement Protocol API secrets
 *
 * Set them all on Cloudflare Pages → Settings → Environment variables.
 */
export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);
  const thanksUrl = new URL("/thanks/", url).toString();

  let fields;
  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      fields = await request.json();
    } else {
      const data = await request.formData();
      fields = Object.fromEntries(data.entries());
    }
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  // Honey-pot: silently succeed for bots
  if (fields._gotcha) {
    return Response.redirect(thanksUrl, 303);
  }

  // Basic validation
  if (!fields.name || !fields.email) {
    return new Response("Missing required fields", { status: 400 });
  }

  const to       = env.QUOTE_TO   || "chumbleysdetailing@gmail.com";
  const from     = env.QUOTE_FROM || "Chumbley's Quote Form <onboarding@resend.dev>";
  const subject  = `Quote request from ${fields.name}`;

  const lines = [
    `Name:           ${fields.name || ""}`,
    `Phone:          ${fields.phone || ""}`,
    `Email:          ${fields.email || ""}`,
    `Vehicle:        ${fields.vehicle || ""}`,
    `Preferred date: ${fields.preferred_date || ""}`,
    `Service:        ${fields.service || ""}`,
    "",
    "Message:",
    fields.message || "(none)",
    "",
    "—",
    `Submitted from ${url.host} at ${new Date().toISOString()}`,
  ];
  const text = lines.join("\n");

  const html = `
    <table style="font-family:system-ui,sans-serif;border-collapse:collapse;width:100%;max-width:560px">
      <tr><td style="padding:6px 12px;color:#666;width:140px">Name</td><td style="padding:6px 12px"><strong>${escape(fields.name)}</strong></td></tr>
      <tr><td style="padding:6px 12px;color:#666">Phone</td><td style="padding:6px 12px">${escape(fields.phone || "")}</td></tr>
      <tr><td style="padding:6px 12px;color:#666">Email</td><td style="padding:6px 12px"><a href="mailto:${escape(fields.email)}">${escape(fields.email)}</a></td></tr>
      <tr><td style="padding:6px 12px;color:#666">Vehicle</td><td style="padding:6px 12px">${escape(fields.vehicle || "")}</td></tr>
      <tr><td style="padding:6px 12px;color:#666">Preferred date</td><td style="padding:6px 12px">${escape(fields.preferred_date || "")}</td></tr>
      <tr><td style="padding:6px 12px;color:#666">Service</td><td style="padding:6px 12px">${escape(fields.service || "")}</td></tr>
      <tr><td style="padding:6px 12px;color:#666;vertical-align:top">Message</td><td style="padding:6px 12px;white-space:pre-wrap">${escape(fields.message || "(none)")}</td></tr>
    </table>
    <p style="font-family:system-ui,sans-serif;color:#888;font-size:12px;margin-top:24px">
      Submitted from ${escape(url.host)} at ${new Date().toISOString()}
    </p>
  `;

  if (!env.RESEND_API_KEY) {
    // Still redirect so the user sees /thanks/, but log loudly so the missing
    // setup is obvious in Cloudflare's deployment logs.
    console.error("[quote] RESEND_API_KEY missing — submission discarded:", text);
    return Response.redirect(thanksUrl, 303);
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      from,
      to:       [to],
      reply_to: fields.email,
      subject,
      text,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[quote] Resend error", res.status, body);
    // Surface a friendly error rather than a raw 500.
    return new Response(
      "Sorry — something went wrong sending your quote request. Please call (615) 670-3379 or email chumbleysdetailing@gmail.com directly.",
      { status: 502, headers: { "Content-Type": "text/plain" } }
    );
  }

  // Server-side conversion tracking via GA4 Measurement Protocol.
  // Runs after the Resend send succeeds so we never count a lead that
  // didn't actually deliver. Errors here don't block the redirect —
  // analytics failure shouldn't fail the user-facing form.
  await sendGA4Lead(env, request, fields).catch(err => {
    console.error("[quote] GA4 MP error:", err);
  });

  return Response.redirect(thanksUrl, 303);
}

/**
 * Fire a generate_lead event server-side via GA4 Measurement Protocol.
 * Reads the visitor's `_ga` cookie if present so the conversion is linked
 * to their existing client_id (and therefore to their other GA4 events
 * like page_view). Falls back to a synthetic id if the cookie is missing.
 */
async function sendGA4Lead(env, request, fields) {
  const measurementId = env.GA4_MEASUREMENT_ID;
  const apiSecret     = env.GA4_API_SECRET;
  if (!measurementId || !apiSecret) {
    console.warn("[quote] GA4 MP not configured — skipping conversion event");
    return;
  }

  // Pull client_id from _ga cookie if available (format: GA1.1.<client_id>)
  let clientId = fields.ga_client_id || "";
  if (!clientId) {
    const cookieHeader = request.headers.get("cookie") || "";
    const m = cookieHeader.match(/_ga=GA[0-9]+\.[0-9]+\.([0-9]+\.[0-9]+)/);
    if (m) clientId = m[1];
  }
  if (!clientId) {
    // Last resort: synthesize one. Conversion still counts but won't
    // attribute to the visitor's other events.
    clientId = `${Math.floor(Math.random() * 1e10)}.${Math.floor(Date.now() / 1000)}`;
  }

  // user_agent_string + ip_override give GA4 a more accurate signal
  const userAgent = request.headers.get("user-agent") || "";
  const ip        = request.headers.get("cf-connecting-ip") || "";

  const payload = {
    client_id: clientId,
    non_personalized_ads: false,
    events: [{
      name:   "generate_lead",
      params: {
        currency:       "USD",
        value:          1,
        form_id:        "quote",
        service:        fields.service        || "",
        preferred_date: fields.preferred_date || "",
        engagement_time_msec: 100,
        // Note: page_location intentionally omitted — let GA4 infer from
        // the referring page_view.
      },
    }],
  };

  const url = new URL("https://www.google-analytics.com/mp/collect");
  url.searchParams.set("measurement_id", measurementId);
  url.searchParams.set("api_secret",     apiSecret);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent":   userAgent,
      ...(ip && { "X-Forwarded-For": ip }),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[quote] GA4 MP non-OK:", res.status, body);
  } else {
    console.log("[quote] GA4 generate_lead fired for client_id", clientId);
  }
}

// HTML-escape user-supplied values for the email body
function escape(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Cloudflare Pages routes POST to onRequestPost above. Anything else gets
// an explicit 405 from this fallback (without it, non-POST methods would
// fall through to static asset handling).
export async function onRequestGet() {
  return new Response("Method Not Allowed", {
    status: 405,
    headers: { "Allow": "POST" },
  });
}
