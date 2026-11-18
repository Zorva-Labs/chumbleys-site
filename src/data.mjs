/* The structured facts the generated pages are built from (2026-11-18).
 *
 * This site is hand-written at the root (index.html, about.html, privacy.html).
 * The service pages, the city pages and /service-areas/ are generated into
 * dist/ by src/pages.mjs, called from build.mjs, from this module, the copy in
 * src/content/ and the desk facts in src/content/places.json. Everything here
 * comes from src/facts.md; nothing is added that is not in it.
 *
 * AREAS is the roster of seo-standards §19: every place within 30 straight-line
 * miles of Gallatin (src/cities.json, from `site-kit cities`), plus the Metro
 * Nashville communities inside that radius, added by hand with their ZIP area's
 * internal point. Only the core markets (core: true) appear in the chrome.
 */

export const SITE = {
  name: 'Chumbley’s Auto Detailing',
  origin: 'https://chumbleysdetailing.com',
  phone: '(615) 670-3379',
  phoneHref: 'tel:+16156703379',
  email: 'chumbleysdetailing@gmail.com',
  city: 'Gallatin',
  region: 'TN',
  geo: { lat: 36.3884, lng: -86.4467 },
  hours: [{ days: 'Mo-Sa', opens: '08:00', closes: '19:00' }],
  crumbRoot: 'Gallatin Car Detailing',
  owner: 'Maddox Chumbley',
};

/* The four services on the home page, plus The Patrol plan from the pricing
   panel. `price` is only what the pricing panel publishes. */
export const SERVICES = [
  { slug: 'mobile-detailing', name: 'Mobile Detailing', short: 'Mobile detailing' },
  { slug: 'interior-detailing', name: 'Interior Detailing', short: 'Interior detailing' },
  { slug: 'exterior-detailing', name: 'Exterior Wash & Wax', short: 'Exterior wash & wax' },
  { slug: 'headlight-restoration', name: 'Headlight Restoration', short: 'Headlight restoration' },
  { slug: 'biweekly-detailing-plan', name: 'The Patrol Bi-Weekly Plan', short: 'The Patrol plan' },
];

export const AREAS = [
  {"city":"Gallatin","state":"TN","named":true,"county":"Sumner County","miles":0,"lat":36.381524,"lng":-86.467021,"hq":true,"blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Cottontown","state":"TN","county":"Sumner County","miles":5.9,"lat":36.448941,"lng":-86.533597,"blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Graball","state":"TN","county":"Sumner County","miles":7.2,"lat":36.4837,"lng":-86.43953,"blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Shackle Island","state":"TN","county":"Sumner County","miles":8.3,"lat":36.377529,"lng":-86.616826,"blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Castalian Springs","state":"TN","named":true,"county":"Sumner County","miles":9,"lat":36.401198,"lng":-86.306778,"blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Hendersonville","state":"TN","named":true,"core":true,"county":"Sumner County","miles":9,"lat":36.307294,"lng":-86.598891,"blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"New Deal","state":"TN","county":"Sumner County","miles":10.6,"lat":36.513864,"lng":-86.562867,"blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Walnut Grove","state":"TN","county":"Sumner County","miles":10.7,"lat":36.488977,"lng":-86.605692,"blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Bethpage","state":"TN","named":true,"county":"Sumner County","miles":11.3,"lat":36.484267,"lng":-86.308523,"blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Green Hill","state":"TN","county":"Wilson County","miles":11.9,"lat":36.232132,"lng":-86.573154,"blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"White House","state":"TN","county":"Robertson County","miles":12.6,"lat":36.464899,"lng":-86.668477,"blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Mount Juliet","state":"TN","county":"Wilson County","miles":12.8,"lat":36.1992,"lng":-86.509489,"blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Bransford","state":"TN","county":"Sumner County","miles":13.6,"lat":36.513296,"lng":-86.285261,"blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Goodlettsville","state":"TN","named":true,"county":"Sumner County","miles":13.6,"lat":36.33303,"lng":-86.704229,"blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Millersville","state":"TN","county":"Sumner County","miles":13.6,"lat":36.396817,"lng":-86.71105,"blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Oak Grove","state":"TN","county":"Sumner County","miles":14.1,"lat":36.572167,"lng":-86.37809,"blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Lebanon","state":"TN","county":"Wilson County","miles":14.3,"lat":36.199381,"lng":-86.344634,"blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Portland","state":"TN","county":"Sumner County","miles":15.3,"lat":36.597486,"lng":-86.526621,"blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Cross Plains","state":"TN","county":"Robertson County","miles":16,"lat":36.541247,"lng":-86.676636,"blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Ridgetop","state":"TN","county":"Robertson County","miles":16.8,"lat":36.403749,"lng":-86.767724,"blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Hartsville/Trousdale County","state":"TN","county":"Trousdale County","miles":17.3,"lat":36.39303,"lng":-86.156691,"blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Westmoreland","state":"TN","county":"Sumner County","miles":17.7,"lat":36.565359,"lng":-86.243956,"blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Fairfield","state":"TN","county":"Sumner County","miles":17.9,"lat":36.620881,"lng":-86.342491,"blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Mitchellville","state":"TN","county":"Sumner County","miles":17.9,"lat":36.634345,"lng":-86.539957,"blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Greenbrier","state":"TN","county":"Robertson County","miles":18.2,"lat":36.421563,"lng":-86.790152,"blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Rural Hill","state":"TN","county":"Wilson County","miles":18.4,"lat":36.118287,"lng":-86.51471,"blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Gladeville","state":"TN","county":"Wilson County","miles":18.5,"lat":36.115741,"lng":-86.431547,"blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Orlinda","state":"TN","county":"Robertson County","miles":19.6,"lat":36.593839,"lng":-86.701561,"blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Tuckers Crossroads","state":"TN","county":"Wilson County","miles":20.6,"lat":36.206622,"lng":-86.167638,"blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Nashville","state":"TN","county":"Davidson County","miles":22.9,"lat":36.1718,"lng":-86.785002,"blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Franklin","state":"KY","county":"Simpson County","miles":23.8,"lat":36.718029,"lng":-86.557576,"blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Springfield","state":"TN","county":"Robertson County","miles":23.8,"lat":36.493599,"lng":-86.872209,"blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Berry Hill","state":"TN","county":"Davidson County","miles":24.7,"lat":36.119618,"lng":-86.767453,"blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"La Vergne","state":"TN","county":"Rutherford County","miles":25.4,"lat":36.022237,"lng":-86.559384,"blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Norene","state":"TN","county":"Wilson County","miles":26,"lat":36.054061,"lng":-86.238175,"blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Lafayette","state":"TN","county":"Macon County","miles":26.2,"lat":36.524047,"lng":-86.030593,"blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Watertown","state":"TN","county":"Wilson County","miles":26.6,"lat":36.100677,"lng":-86.13944,"blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Coopertown","state":"TN","county":"Robertson County","miles":27.8,"lat":36.414238,"lng":-86.965786,"blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Oak Hill","state":"TN","county":"Davidson County","miles":28.3,"lat":36.068447,"lng":-86.793127,"blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Smyrna","state":"TN","county":"Rutherford County","miles":28.7,"lat":35.969019,"lng":-86.528617,"blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Scottsville","state":"KY","county":"Allen County","miles":29.2,"lat":36.749261,"lng":-86.207621,"blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Belle Meade","state":"TN","county":"Davidson County","miles":29.2,"lat":36.099441,"lng":-86.85626,"blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Adairville","state":"KY","county":"Logan County","miles":29.7,"lat":36.67504,"lng":-86.858204,"blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Forest Hills","state":"TN","county":"Davidson County","miles":29.8,"lat":36.069968,"lng":-86.83623,"blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Walterhill","state":"TN","county":"Rutherford County","miles":29.8,"lat":35.957291,"lng":-86.367849,"blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Greenvale","state":"TN","county":"Wilson County","miles":29.9,"lat":36.005486,"lng":-86.201211,"blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"South Carthage","state":"TN","county":"Smith County","miles":30,"lat":36.239702,"lng":-85.957462,"blurb":"","neighborhoods":[],"permitOffice":""},
  /* Metro Nashville communities inside 30 miles (not Census places): the ZIP area’s internal point, 2024 Census ZCTA gazetteer. */
  {"city":"Madison","state":"TN","named":true,"county":"Davidson County","miles":15.6,"lat":36.255279,"lng":-86.698667,"kind":"metro","zcta":"37115","blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Old Hickory","state":"TN","county":"Davidson County","miles":12.6,"lat":36.237708,"lng":-86.60703,"kind":"metro","zcta":"37138","blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Hermitage","state":"TN","county":"Davidson County","miles":17.4,"lat":36.145176,"lng":-86.576636,"kind":"metro","zcta":"37076","blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Donelson","state":"TN","county":"Davidson County","miles":18.3,"lat":36.169038,"lng":-86.662565,"kind":"metro","zcta":"37214","blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Inglewood","state":"TN","county":"Davidson County","miles":18.5,"lat":36.215017,"lng":-86.726911,"kind":"metro","zcta":"37216","blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"East Nashville","state":"TN","county":"Davidson County","miles":20.3,"lat":36.179319,"lng":-86.731083,"kind":"metro","zcta":"37206","blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Antioch","state":"TN","county":"Davidson County","miles":24.5,"lat":36.052592,"lng":-86.630295,"kind":"metro","zcta":"37013","blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Whites Creek","state":"TN","county":"Davidson County","miles":21.5,"lat":36.278598,"lng":-86.831464,"kind":"metro","zcta":"37189","blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Joelton","state":"TN","county":"Davidson County","miles":25.3,"lat":36.332761,"lng":-86.916886,"kind":"metro","zcta":"37080","blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Bordeaux","state":"TN","county":"Davidson County","miles":29.0,"lat":36.171353,"lng":-86.918161,"kind":"metro","zcta":"37218","blurb":"","neighborhoods":[],"permitOffice":""},
  {"city":"Green Hills","state":"TN","county":"Davidson County","miles":29.1,"lat":36.081955,"lng":-86.834904,"kind":"metro","zcta":"37215","blurb":"","neighborhoods":[],"permitOffice":""},
];
