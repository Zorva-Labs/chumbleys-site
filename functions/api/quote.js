/**
 * Cloudflare Pages Function — handles quote form submissions for Chumbley's.
 * Replaces the previous FormSubmit integration, which required per-recipient
 * email activation.
 *
 * Required env var: RESEND_API_KEY  (set in Cloudflare Pages → Settings →
 *   Environment variables → Production)
 *
 * Optional env vars:
 *   QUOTE_TO    — destination email (defaults to chumbleysdetailing@gmail.com)
 *   QUOTE_FROM  — sender (defaults to "Chumbley's Quote Form
 *                <onboarding@resend.dev>", which Resend provides without
 *                domain verification)
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

  return Response.redirect(thanksUrl, 303);
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

// Reject anything that isn't POST so we don't expose the function to GET probes
export async function onRequest({ request }) {
  if (request.method === "POST") return onRequestPost(arguments[0]);
  return new Response("Method Not Allowed", {
    status: 405,
    headers: { "Allow": "POST" },
  });
}
