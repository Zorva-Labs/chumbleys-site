/* Where this lead came from, for a form whose mail is not sent by this site
   (FormSubmit, a mailto: handler) — the same block a lead saved by /api/lead
   carries (Michael, 2026-10-24: "all forms are supposed to send the traffic
   info with the lead form info").

   The visit cookie is HttpOnly, so this asks /api/visit for the rows the first
   time someone starts on a form, then:
   - a form posting to formsubmit.co gets them as hidden fields (one per row,
     after a "Where this lead came from" heading) and the channel at the end of
     its _subject;
   - a form that builds its own mailto: reads window.leadSource.text({ brief: true })
     and adds it to the body (and .tag() to the subject).
   Nothing waits on it: a form sent before the answer arrives goes as it was.
   One copy: ~/site-kit/form/assets/js/lead-source.js. */
(function () {
  var data = null, asked = false;
  function ask() {
    if (asked || !window.fetch) return; asked = true;
    fetch('/api/visit', { credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d && d.rows) data = d; })
      .catch(function () {});
  }
  window.leadSource = {
    ready: function () { return !!data; },
    /* { brief: true } for a mailto: body, which the visitor sees before they
       send it: the source and the pages, not the edge's guess at their area
       or their network. */
    text: function (opts) {
      if (!data) return '';
      var brief = opts && opts.brief, keep = { 'Source': 1, 'Campaign': 1, 'Referred by': 1, 'Landed on': 1, 'Form on': 1, 'Device': 1 };
      var rows = data.rows.filter(function (r) { return !brief || keep[r[0]]; });
      return ['Where this lead came from'].concat(rows.map(function (r) { return r[0] + ': ' + r[1]; }))
        .concat(data.note && !brief ? ['', data.note] : []).join('\n');
    },
    tag: function () { return data && data.tag ? ' · ' + data.tag : ''; }
  };
  function add(form, name, value) {
    var i = form.querySelector('input[type="hidden"][data-lead-source][name="' + name.replace(/"/g, '') + '"]');
    if (!i) { i = document.createElement('input'); i.type = 'hidden'; i.name = name; i.setAttribute('data-lead-source', ''); form.appendChild(i); }
    i.value = value;
  }
  function fill(form) {
    if (!data || !/formsubmit\.co/i.test(form.getAttribute('action') || '')) return;
    add(form, 'Where this lead came from', '—');
    data.rows.forEach(function (r) { add(form, r[0], r[1]); });
    if (data.note) add(form, 'About the source', data.note);
    var s = form.querySelector('input[name="_subject"]');
    if (s && data.tag && !s.hasAttribute('data-lead-tagged')) { s.value += ' · ' + data.tag; s.setAttribute('data-lead-tagged', ''); }
  }
  document.addEventListener('focusin', function (e) { if (e.target.closest && e.target.closest('form')) ask(); });
  document.addEventListener('pointerdown', function (e) { if (e.target.closest && e.target.closest('form')) ask(); });
  /* capture: runs before a site's own submit handler, so a handler that sends
     the form itself (fetch, mailto) already sees the fields. */
  document.addEventListener('submit', function (e) { if (e.target && e.target.tagName === 'FORM') fill(e.target); }, true);
})();
