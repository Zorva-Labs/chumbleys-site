/* Traffic beacons — standalone, no dependencies, safe to load on any page.
 *
 * Two jobs, both same-origin so there is no third-party hostname for a blocker
 * to match on:
 *   1. how long the visitor was ACTIVELY on the page (the timer pauses when
 *      the tab is hidden, or a forgotten tab reports hours)
 *   2. conversions — tap-to-call, form submit, and the thank-you arrival
 *
 * Page views themselves are NOT counted here. They are logged server-side by
 * functions/_middleware.js before this file even downloads, which is what makes
 * them immune to blockers and to JavaScript being off entirely.
 *
 * Drop this in with <script src="/assets/js/traffic-beacons.js" defer></script>
 * or paste the two blocks into an existing bundle.
 */
(function () {
  'use strict';
  var $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };


/* ---------------------------- engagement beacon ------------------------
   Reports ACTIVE seconds on the page — the timer pauses while the tab is
   hidden, so a browser left open overnight does not report eight hours of
   "engagement". Same-origin, no third-party script, nothing for a blocker to
   match on. Fire-and-forget: it can never affect the page. */
(function engagement() {
  if (!navigator.sendBeacon) return;
  var path = location.pathname;
  if (path.indexOf('/traffic') === 0 || path.indexOf('/api') === 0) return;

  /* Identifies this page view so repeated reports update one row rather
     than inserting duplicates. */
  var pvid = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  var active = 0;
  var last = Date.now();
  var visible = document.visibilityState !== 'hidden';

  function tick() {
    var now = Date.now();
    if (visible) active += (now - last) / 1000;
    last = now;
  }

  function send() {
    tick();
    var secs = Math.round(active);
    if (secs < 1) return;
    try {
      navigator.sendBeacon('/api/pv-time', new Blob(
        [JSON.stringify({ p: path, s: secs, id: pvid })],
        { type: 'application/json' }
      ));
    } catch (e) { /* beacons never throw upward */ }
  }

  document.addEventListener('visibilitychange', function () {
    tick();
    visible = document.visibilityState !== 'hidden';
    if (!visible) send();
  });

  /* Report periodically so a visitor who never "leaves" is still counted,
     then once more on the way out. */
  setInterval(send, 15000);
  window.addEventListener('pagehide', send);
})();

/* ---------------------------- conversion beacon ------------------------
   For most local businesses a lead is a phone call, not a form, so tap-to-call is
   tracked as a first-class conversion. Without this the traffic dashboard
   would only ever show visits, and a traffic number with no conversion
   beside it is a vanity metric. */
(function conversions() {
  if (!navigator.sendBeacon) return;

  function report(name, detail) {
    try {
      navigator.sendBeacon('/api/pv-event', new Blob(
        [JSON.stringify({ n: name, p: location.pathname, d: detail || null })],
        { type: 'application/json' }
      ));
    } catch (e) { /* never surface a beacon failure */ }
  }

  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (href.indexOf('tel:') === 0) report('call');
    else if (href.indexOf('mailto:') === 0) report('email');
    else if (href.indexOf('google.com/maps') > -1) report('directions');
  }, true);

  /* Submitted, which is not the same as delivered — the matching
     form_complete is recorded when FormSubmit lands the visitor on
     /thank-you/, so the two together show any drop-off in between. */
  $$('[data-form]').forEach(function (form) {
    form.addEventListener('submit', function () {
      if (!form.checkValidity()) return;
      var sel = form.querySelector('select[name="Project Type"]');
      report('form_submit', sel && sel.value ? sel.value : null);
    });
  });

  if (/^\/(thank-you|thanks)(\/|\.html|$)/.test(location.pathname)) report('form_complete');
})();
})();
