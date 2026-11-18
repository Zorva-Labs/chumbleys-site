/* The desk facts for the city pages: src/content/places.json (2026-11-18).
 *
 *   node scripts/place-facts.mjs
 *
 * For each place in src/data.mjs → AREAS, the Census Bureau's American
 * Community Survey 5-year figures that bear on a mobile detailer's work there —
 * how people park (houses or apartment lots), how many vehicles a household
 * keeps, how many work from home (the car sits in the driveway on a weekday)
 * and how far the rest drive to work — read through Census Reporter's data
 * endpoint (no key). A Census place is read as itself; a Metro Nashville
 * community, which has no census geography, as its ZIP area (ZCTA), and the
 * page has to say so. Nothing about the business is in this file.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const { AREAS } = await import(path.join(ROOT, 'src/data.mjs'));
const STATE_FIPS = { TN: '47', KY: '21' };
const TABLES = ['B01003', 'B25003', 'B25024', 'B25044', 'B08301', 'B08303'];

/* Census place GEOIDs from the 2024 place gazetteer that site-kit cities caches. */
const gaz = execFileSync('unzip', ['-p', path.join(os.homedir(), '.cache/site-kit/gaz_place.zip')], { maxBuffer: 64 << 20 }).toString('utf8')
  .split('\n').slice(1).map((l) => l.split('\t')).filter((f) => f[0] === 'TN' || f[0] === 'KY');
const geoidOf = (a) => {
  if (a.zcta) return `86000US${a.zcta}`;
  const want = a.city === 'Nashville' ? 'Nashville-Davidson metropolitan government (balance)' : a.city;
  const hit = gaz.find((f) => f[0] === a.state && (f[3] === want || f[3].replace(/ (city|town|CDP)$/, '') === want));
  if (!hit) throw new Error(`no GEOID for ${a.city}, ${a.state}`);
  return `16000US${hit[1]}`;
};

const geo = AREAS.map((a) => ({ a, id: geoidOf(a) }));
const data = {};
let release;
for (let i = 0; i < geo.length; i += 15) {
  const ids = geo.slice(i, i + 15).map((g) => g.id).join(',');
  const r = await fetch(`https://api.censusreporter.org/1.0/data/show/latest?table_ids=${TABLES.join(",")}&geo_ids=${ids}`, { headers: { "user-agent": "curl/8.7.1", accept: "*/*" } });
  if (!r.ok) throw new Error(`Census Reporter ${r.status}`);
  const j = await r.json();
  release = j.release;
  Object.assign(data, j.data);
}

const pct = (n, d) => (d ? Math.round((100 * n) / d) : null);
const places = geo.map(({ a, id }) => {
  const t = data[id];
  const v = (tab, col) => t[tab].estimate[`${tab}${String(col).padStart(3, '0')}`] || 0;
  const hh = v('B25003', 1);
  const units = v('B25024', 1);
  const veh = [3, 4, 5, 6, 7, 8].map((c) => v('B25044', c) + v('B25044', c + 7)); // 0,1,2,3,4,5+ vehicles
  const workers = v('B08301', 1);
  const commuters = v('B08303', 1);
  const slug = `${a.city}-${a.state}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return {
    slug, city: a.city, state: a.state, county: a.county, kind: a.zcta ? 'metro community' : a.kind || null,
    miles: a.miles, lat: a.lat, lng: a.lng, geoid: id, acsGeo: a.zcta ? `ZIP ${a.zcta}` : 'place',
    population: v('B01003', 1),
    households: hh,
    pctRenters: pct(v('B25003', 3), hh),
    pctSingleDetached: pct(v('B25024', 2), units),
    pctAttached: pct(v('B25024', 3), units),
    pctApartments5plus: pct(v('B25024', 6) + v('B25024', 7) + v('B25024', 8) + v('B25024', 9), units),
    pctMobileHomes: pct(v('B25024', 10), units),
    pctNoVehicle: pct(veh[0], hh),
    pctThreePlusVehicles: pct(veh[3] + veh[4] + veh[5], hh),
    pctWorkFromHome: pct(v('B08301', 21), workers),
    pctDroveAlone: pct(v('B08301', 3), workers),
    pctCommute30plus: pct([8, 9, 10, 11, 12, 13].reduce((s, c) => s + v('B08303', c), 0), commuters),
    pctCommute45plus: pct([11, 12, 13].reduce((s, c) => s + v('B08303', c), 0), commuters),
  };
});

const out = {
  note: 'Desk facts for the city pages (2026-11-18). Every figure carries its source; nothing here is about the business.',
  sources: {
    census: `U.S. Census Bureau, American Community Survey ${release?.name || ''} (${release?.years || ''}), tables B01003 (population), B25003 (tenure), B25024 (units in structure), B25044 (vehicles available), B08301 (means of transportation to work) and B08303 (travel time to work), read through Census Reporter (api.censusreporter.org). A Metro Nashville community has no census geography of its own and is read from its ZIP area (acsGeo). Small places carry wide margins of error: say "about".`,
    miles: 'Straight-line miles from Gallatin’s center, 2024 Census place gazetteer (site-kit cities); a Metro Nashville community is measured from its ZIP area’s internal point (2024 ZCTA gazetteer).',
    county: 'Census geocoder at the place’s center (site-kit cities); Goodlettsville straddles Davidson and Sumner counties.',
  },
  places,
};
fs.writeFileSync(path.join(ROOT, 'src/content/places.json'), `${JSON.stringify(out, null, 1)}\n`);
console.log(`${places.length} places, ${release?.name}`);
