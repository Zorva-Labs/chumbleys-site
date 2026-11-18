/* The generated pages (seo-standards §19, 2026-11-18): one page per service,
 * one per place within 30 miles of Gallatin, and /service-areas/, written into
 * dist/ by build.mjs before its link check, FAQPage and lastmod steps run.
 *
 * The rest of the site is hand-written at the root. These pages borrow its
 * chrome from about.html at build time (the head's fonts, stylesheet and
 * Google tag, the header, the footer and the closing scripts), so a change to
 * the header or footer there reaches them too. The words come from
 * src/content/ (services.mjs, areas-*.mjs) and the place figures from
 * src/content/places.json; the structure is here. No FAQPage is written here:
 * build.mjs writes it from the visible FAQ, as it does for every page.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const { SITE, SERVICES, AREAS } = await import(path.join(ROOT, 'src/data.mjs'));
const { COPY: SERVICE_COPY, HUB } = await import(path.join(ROOT, 'src/content/services.mjs'));
const PLACES = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/content/places.json'), 'utf8'));

const AREA_COPY = {};
for (const f of fs.readdirSync(path.join(ROOT, 'src/content')).filter((f) => /^areas-\d+\.mjs$/.test(f)).sort()) {
  Object.assign(AREA_COPY, (await import(path.join(ROOT, 'src/content', f))).COPY);
}

const O = SITE.origin;
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slugOf = (a) => `${a.city}-${a.state}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
/* How a place is said on the page: "Hartsville", not the consolidated government's full name. */
const shortName = (a) => (a.city === 'Hartsville/Trousdale County' ? 'Hartsville' : a.city);
const placeName = (a) => `${shortName(a)}, ${a.state}`;
const miles = (a, b) => {
  const r = (d) => (d * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 2 * 3958.8 * Math.asin(Math.sqrt(h));
};
const today = new Date().toISOString().slice(0, 10);

/* ---- the chrome, lifted from about.html ---- */
const about = fs.readFileSync(path.join(ROOT, 'about.html'), 'utf8');
const between = (s, a, b) => { const i = s.indexOf(a); const j = s.indexOf(b, i); if (i < 0 || j < 0) throw new Error(`pages.mjs: about.html has no ${a} … ${b}`); return s.slice(i, j + b.length); };
const HEAD_ASSETS = between(about, '<!-- The four faces', '</script>');
const HEADER = between(about, '<header class="nav">', '</header>').replace(/ aria-current="page"/g, '');
const FOOTER = between(about, '<!-- =================== FOOTER', '</footer>');
const TAIL = about.slice(about.indexOf('</footer>') + '</footer>'.length, about.indexOf('</body>'));

function shell({ url, title, description, graph, main, ogAlt }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />

  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <meta name="author" content="${esc(SITE.name)}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <meta name="theme-color" content="#ffd400" />
  <link rel="canonical" href="${url}" />

  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${esc(SITE.name)}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:image" content="${O}/assets/og-image.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${esc(ogAlt)}" />
  <meta property="og:locale" content="en_US" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${O}/assets/og-image.png" />

  ${HEAD_ASSETS}

  <script type="application/ld+json">
${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 1).replace(/</g, '\\u003c')}
  </script>
</head>
<body>

${HEADER}

<main id="top">
${main}
</main>

${FOOTER}
${TAIL}</body>
</html>
`;
}

/* ---- the pieces every generated page shares ---- */
const crumbs = (trail) => `<nav class="crumbs" aria-label="Breadcrumb"><ol>${trail.map((c, i) => (i === trail.length - 1 ? `<li aria-current="page">${esc(c.name)}</li>` : `<li><a href="${c.href}">${esc(c.name)}</a></li>`)).join('')}</ol></nav>`;
const breadcrumbNode = (url, trail) => ({
  '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`,
  itemListElement: trail.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: `${O}${c.href}` })),
});
const webPage = (url, title, description, type = 'WebPage') => ({
  '@type': type, '@id': `${url}#webpage`, url, name: title, description,
  isPartOf: { '@id': `${O}/#website` }, about: { '@id': `${O}/#business` },
  breadcrumb: { '@id': `${url}#breadcrumb` }, inLanguage: 'en-US', dateModified: today,
});
const placeNode = (a) => ({
  '@type': a.kind === 'incorporated' || a.city === 'Nashville' ? 'City' : 'Place',
  name: placeName(a),
  ...(a.county ? { containedInPlace: { '@type': 'AdministrativeArea', name: `${a.county}, ${a.state === 'KY' ? 'Kentucky' : 'Tennessee'}` } } : {}),
  geo: { '@type': 'GeoCoordinates', latitude: a.lat, longitude: a.lng },
});

const hero = (banner, h1, lead) => `
<section class="section page-hero">
  <div class="section-head">
    <div class="bubble bubble-banner"><strong>${esc(banner)}</strong></div>
    <h1 class="kapow kapow-page">${esc(h1)}</h1>
    <p class="page-lead">${esc(lead)}</p>
  </div>
</section>`;

const article = (c, aside) => `
<section class="section page-body">
  <div class="page-grid">
    <article class="panel page-panel">
      <div class="tldr"><p class="tldr__label">TL;DR</p><p class="tldr__text" data-short-answer>${esc(c.tldr)}</p></div>
${c.sections.map((s) => `      <h2>${esc(s.h)}</h2>\n      ${s.body}`).join('\n')}
    </article>
    ${aside}
  </div>
</section>`;

const faqSection = (title, items) => `
<section id="faq" class="section section-faq">
  <div class="section-head">
    <div class="bubble bubble-banner"><strong>ASKED AND ANSWERED</strong></div>
    <h2 class="kapow kapow-sub">${esc(title)}</h2>
  </div>
  <div class="faq-grid">
${items.map((f) => `    <details class="faq-item">
      <summary><span>${esc(f.q)}</span></summary>
      <p>${esc(f.a)}</p>
    </details>`).join('\n')}
  </div>
</section>`;

const PHONE_SVG = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" stroke="#111" stroke-width="2" stroke-linejoin="round" d="M5 3h4l2 5-3 2c1 3 4 6 7 7l2-3 5 2v4c0 1-1 2-2 2C9 22 2 15 2 6c0-1 1-2 2-2z"/></svg>';
const cta = (line) => `
<section class="section section-cta cta">
  <div class="panel cta-panel">
    <div class="halftone-bg yellow"></div>
    <p class="cta-title">CALL THE HERO!</p>
    <p class="cta-sub">${esc(line)}</p>
    <div class="cta-actions">
      <a class="btn btn-blue lg" href="${SITE.phoneHref}">${PHONE_SVG} ${esc(SITE.phone)}</a>
      <a class="btn btn-yellow lg" href="/#quote">GET A QUOTE ★</a>
    </div>
    <div class="hours"><strong>HOURS:</strong> Mon–Sat · 8a–7p · By appointment</div>
  </div>
</section>`;

const serviceNav = (current) => `<nav class="panel page-nav" aria-label="Services">
      <p class="nav-title">WHAT MADDOX DOES</p>
      <ul>${SERVICES.filter((s) => s.slug !== current).map((s) => `<li><a href="/${s.slug}/">${esc(s.name)}</a></li>`).join('')}<li><a href="/#pricing">Packages and prices</a></li></ul>
    </nav>`;

/* ---- the place pages ---- */
const placeFacts = new Map(PLACES.places.map((p) => [p.slug, p]));
const pctRow = (label, v) => (v == null ? '' : `<tr><th scope="row">${label}</th><td>${v}%</td></tr>`);
function factCard(a, p) {
  const geoLabel = p.acsGeo === 'place' ? '' : ` (${p.acsGeo} area)`;
  const rows = p.population
    ? [
      `<tr><th scope="row">People${geoLabel}</th><td>${p.population.toLocaleString('en-US')}</td></tr>`,
      `<tr><th scope="row">Households</th><td>${p.households.toLocaleString('en-US')}</td></tr>`,
      pctRow('Households renting', p.pctRenters),
      pctRow('Single-family detached homes', p.pctSingleDetached),
      pctRow('Homes in buildings of 5+ units', p.pctApartments5plus),
      pctRow('Mobile homes', p.pctMobileHomes),
      pctRow('Households with 3+ vehicles', p.pctThreePlusVehicles),
      pctRow('Workers who work from home', p.pctWorkFromHome),
      pctRow('Commutes of 30+ minutes one way', p.pctCommute30plus),
    ].join('')
    : '<tr><th scope="row">People</th><td>none recorded</td></tr>';
  const profile = `https://censusreporter.org/profiles/${p.geoid}/`;
  return `<aside class="panel fact-card" aria-label="${esc(shortName(a))} in numbers">
      <p class="fact-title">${esc(shortName(a).toUpperCase())} BY THE NUMBERS</p>
      <table>
        <tr><th scope="row">County</th><td>${esc(a.county)}, ${a.state}</td></tr>
        <tr><th scope="row">From Gallatin</th><td>${a.miles === 0 ? 'home base' : `about ${Math.round(a.miles)} miles, straight line`}</td></tr>
        ${rows}
      </table>
      <p class="fact-src">Source: U.S. Census Bureau, <a href="${profile}" target="_blank" rel="nofollow noopener">American Community Survey 2020–2024</a>${p.acsGeo === 'place' ? '' : `, for the ${esc(p.acsGeo)} area`}; distances from the 2024 Census gazetteer.</p>
    </aside>`;
}
function nearbyNav(a) {
  const near = AREAS.filter((b) => b !== a).map((b) => ({ b, d: miles(a, b) })).sort((x, y) => x.d - y.d).slice(0, 6);
  return `<nav class="panel page-nav" aria-label="Towns near ${esc(shortName(a))}">
      <p class="nav-title">CLOSEST TO ${esc(shortName(a).toUpperCase())}</p>
      <ul>${near.map(({ b, d }) => `<li><a href="/${slugOf(b)}/">${esc(placeName(b))}</a> <span>${Math.max(1, Math.round(d))} mi</span></li>`).join('')}<li><a href="/service-areas/">Every town Maddox covers</a></li></ul>
    </nav>`;
}
const areaTitle = (a) => {
  for (const t of [`Mobile Detailing in ${placeName(a)} | Chumbley’s`, `Mobile Car Detailing in ${placeName(a)}`, `Mobile Detailing in ${placeName(a)}`]) if (t.length <= 60) return t;
  return `Mobile Detailing in ${shortName(a)}`;
};

export function buildPages(OUT) {
  const written = [];
  const missing = [];
  const write = (slug, html) => {
    fs.mkdirSync(path.join(OUT, slug), { recursive: true });
    fs.writeFileSync(path.join(OUT, slug, 'index.html'), html);
    written.push(`/${slug}/`);
  };

  /* services */
  for (const s of SERVICES) {
    const c = SERVICE_COPY[s.slug];
    if (!c) { missing.push(`service ${s.slug}`); continue; }
    const url = `${O}/${s.slug}/`;
    const trail = [{ name: SITE.crumbRoot, href: '/' }, { name: s.name, href: `/${s.slug}/` }];
    const named = AREAS.filter((a) => a.named);
    const graph = [
      webPage(url, c.title, c.blurb),
      { '@type': 'Service', '@id': `${url}#service`, name: s.name, serviceType: s.name, url, provider: { '@id': `${O}/#business` }, areaServed: named.map(placeNode), description: c.blurb },
      breadcrumbNode(url, trail),
    ];
    const towns = `<nav class="panel page-nav" aria-label="Towns">
      <p class="nav-title">THE SIX TOWNS ON HIS LIST</p>
      <ul>${named.map((a) => `<li><a href="/${slugOf(a)}/">${esc(placeName(a))}</a></li>`).join('')}<li><a href="/service-areas/">All 58 places within 30 miles</a></li></ul>
    </nav>`;
    const main = `${crumbs(trail)}${hero(c.banner.toUpperCase(), c.h1, c.lead)}${article(c, `<div class="page-side">${serviceNav(s.slug)}${towns}</div>`)}${faqSection(`${s.short} questions`, c.faq)}${cta('Free quotes by call or text. The truck brings the water and the power.')}`;
    write(s.slug, shell({ url, title: c.title, description: c.blurb, graph, main, ogAlt: `${s.name} by Chumbley’s Auto Detailing, Gallatin, TN` }));
  }

  /* places */
  for (const a of AREAS) {
    const slug = slugOf(a);
    const c = AREA_COPY[slug];
    const p = placeFacts.get(slug);
    if (!c || !p) { missing.push(`place ${slug}`); continue; }
    const url = `${O}/${slug}/`;
    const title = areaTitle(a);
    const trail = [{ name: SITE.crumbRoot, href: '/' }, { name: 'Service Areas', href: '/service-areas/' }, { name: placeName(a), href: `/${slug}/` }];
    const graph = [
      webPage(url, title, c.blurb),
      { '@type': 'Service', '@id': `${url}#service`, name: `Mobile car detailing in ${placeName(a)}`, serviceType: 'Mobile car detailing', url, provider: { '@id': `${O}/#business` }, areaServed: placeNode(a), description: c.blurb },
      breadcrumbNode(url, trail),
    ];
    const side = `<div class="page-side">${factCard(a, p)}${nearbyNav(a)}${serviceNav(null)}</div>`;
    const main = `${crumbs(trail)}${hero(c.banner.toUpperCase(), c.h1, c.lead)}${article(c, side)}${faqSection(`${shortName(a)} questions`, c.faq)}${cta(a.named ? `${shortName(a)} is on the list. Call or text for a free quote.` : `Outside the six towns? Text the address and a photo, and ask.`)}`;
    write(slug, shell({ url, title, description: c.blurb, graph, main, ogAlt: `Mobile detailing in ${placeName(a)} by Chumbley’s Auto Detailing` }));
  }

  /* the hub: every place, by county, nearest first */
  {
    const url = `${O}/service-areas/`;
    const trail = [{ name: SITE.crumbRoot, href: '/' }, { name: 'Service Areas', href: '/service-areas/' }];
    const counties = new Map();
    for (const a of [...AREAS].sort((x, y) => x.miles - y.miles)) {
      const k = `${a.county}, ${a.state}`;
      if (!counties.has(k)) counties.set(k, []);
      counties.get(k).push(a);
    }
    const groups = [...counties.entries()].sort((x, y) => x[1][0].miles - y[1][0].miles);
    const list = groups.map(([county, as]) => `<div class="panel area-group">
        <h3>${esc(county)}</h3>
        <ul>${as.map((a) => `<li><a href="/${slugOf(a)}/">${esc(a.city === 'Hartsville/Trousdale County' ? 'Hartsville/Trousdale County' : a.city)}</a> <span>${a.miles === 0 ? 'home' : `${Math.round(a.miles)} mi`}</span>${a.named ? ' <strong class="on-list">on the list</strong>' : ''}</li>`).join('')}</ul>
      </div>`).join('\n      ');
    const graph = [
      webPage(url, HUB.title, HUB.blurb, 'CollectionPage'),
      { '@type': 'Service', '@id': `${url}#service`, name: 'Mobile car detailing', serviceType: 'Mobile car detailing', url, provider: { '@id': `${O}/#business` }, areaServed: AREAS.map(placeNode) },
      breadcrumbNode(url, trail),
    ];
    const main = `${crumbs(trail)}${hero(HUB.banner.toUpperCase(), HUB.h1, HUB.lead)}
<section class="section page-body">
  <article class="panel page-panel page-panel-wide">
    <div class="tldr"><p class="tldr__label">TL;DR</p><p class="tldr__text" data-short-answer>${esc(HUB.tldr)}</p></div>
    <h2>${esc(HUB.listHeading)}</h2>
    ${HUB.intro.map((t) => `<p>${esc(t)}</p>`).join('\n    ')}
    <div class="area-groups">
      ${list}
    </div>
  </article>
</section>${faqSection('Area questions', HUB.faq)}${cta('Gallatin, Hendersonville and around. Call or text for a free quote.')}`;
    write('service-areas', shell({ url, title: HUB.title, description: HUB.blurb, graph, main, ogAlt: 'The towns Chumbley’s Auto Detailing covers around Gallatin, TN' }));
  }

  return { written, missing };
}

/* For llms.txt and the sitemap. */
export const pageIndex = () => ({
  services: SERVICES.map((s) => ({ url: `${O}/${s.slug}/`, name: s.name, blurb: SERVICE_COPY[s.slug]?.blurb })),
  places: AREAS.map((a) => ({ url: `${O}/${slugOf(a)}/`, name: placeName(a), county: a.county })),
  hub: `${O}/service-areas/`,
});

/* The home page's own list of every place (seo-standards §19: the home page's
   body names and links them all), written into dist/index.html between the
   areas markers. */
export function homeAreas() {
  const counties = new Map();
  for (const a of [...AREAS].sort((x, y) => x.miles - y.miles)) {
    const k = `${a.county}, ${a.state}`;
    if (!counties.has(k)) counties.set(k, []);
    counties.get(k).push(a);
  }
  const groups = [...counties.entries()].sort((x, y) => x[1][0].miles - y[1][0].miles);
  return `<section id="areas" class="section section-areas">
  <div class="section-head">
    <div class="bubble bubble-banner"><strong>THE PATROL ROUTE</strong></div>
    <h2 class="kapow">WHERE MADDOX <span>DRIVES</span></h2>
  </div>
  <p class="areas-lead">Home base is Gallatin. The six towns on his list are marked; every other place within 30 miles has a page too. Outside the list, a call or text decides the drive.</p>
  <div class="area-groups">
    ${groups.map(([county, as]) => `<div class="panel area-group">
      <h3>${esc(county)}</h3>
      <ul>${as.map((a) => `<li><a href="/${slugOf(a)}/">${esc(a.city)}</a>${a.named ? ' <strong class="on-list">on the list</strong>' : ''}</li>`).join('')}</ul>
    </div>`).join('\n    ')}
  </div>
  <p class="areas-more"><a class="btn btn-yellow" href="/service-areas/">ALL SERVICE AREAS ★</a></p>
</section>`;
}
