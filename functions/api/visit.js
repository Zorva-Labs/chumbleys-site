// GET /api/visit — where this visit came from, for a form that posts somewhere
// other than this site (FormSubmit, a mailto: handler), so its mail carries
// the same "Where this lead came from" block as a lead /api/lead saves
// (Michael, 2026-10-24: "all forms are supposed to send the traffic info with
// the lead form info").
//
// The entry cookie (`ts_src`) is HttpOnly, so the page cannot read it; this
// endpoint reads it from the same-origin request and answers with the rows,
// already in reader's words (_lib/visit.js). Nothing is stored and nothing is
// logged. assets/js/lead-source.js asks for it when someone starts on a form.
// One copy: ~/site-kit/form/functions/api/visit.js.

import { visitOf, sourceRows, sourceNote, channelWords } from '../_lib/visit.js';

export async function onRequestGet({ request }) {
  const visit = visitOf(request);
  const page = (() => { try { return new URL(request.headers.get('referer') || '').pathname; } catch { return ''; } })();
  return new Response(JSON.stringify({
    rows: sourceRows(visit, { form: page }),
    note: sourceNote(visit),
    tag: visit.channel ? channelWords(visit.channel) : '',
  }), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
}
