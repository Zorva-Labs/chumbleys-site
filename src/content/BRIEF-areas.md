# Brief: city page copy (2026-11-18)

You write the copy for one batch of Chumbley’s Auto Detailing’s city pages (chumbleysdetailing.com, a one-man mobile detailer based in Gallatin, TN). Output: one file, `src/content/areas-<batch>.mjs`, exporting `COPY`, keyed by slug:

```js
export const COPY = {
  'cottontown-tn': {
    blurb: '…',   // the meta description: 120–160 characters, plain text, names the place
    banner: '…',  // a short kicker above the title, 2–6 words, plain text, e.g. 'Sumner County, 6 miles out'
    h1: '…',      // the visible title, 18–42 characters (it is set very large), plain text, names the place
    lead: '…',    // one sentence under the title, plain text, 15–35 words
    tldr: '…',    // 40–110 words, plain text, 2–4 sentences that answer what the page settles, with this place's own numbers
    sections: [   // exactly 3
      { h: 'A question someone in this place would ask?', body: '<p>…</p><p>…</p>' },
    ],
    faq: [        // exactly 4, plain text answers of 35–70 words
      { q: '…?', a: '…' },
    ],
  },
};
```

The page template adds everything else: the breadcrumb, a fact card that lists the place's numbers with their sources, the service links, the six nearest places, the visible FAQ and its schema, and the call-to-action. Do not write any of that.

## What you may say, and nothing else

1. **The business**, only what is in `src/facts.md` and on the home page (`index.html`). In short:
   - Maddox Chumbley is the founder and lead detailer. He was born and raised in Gallatin, TN, worked on the family cars before he could drive, and the business grew out of Saturday wash sessions in the driveway.
   - It is mobile: he comes to the car (a driveway, an office parking lot, a jobsite, an apartment complex). Water and power ride on the truck, so the customer supplies neither.
   - Hours are Monday to Saturday, 8 a.m. to 7 p.m., by appointment. Call or text (615) 670-3379; a text often gets the faster answer. Quotes are free: send a photo of the vehicle and say what you want done.
   - Packages, with the pricing panel’s own numbers:
     - Sidekick, $109 and up: hand wash and dry, wheels and tires, windows inside and out, interior vacuum, tire shine. About 1 to 1.5 hours.
     - Hero, $189 and up, the most popular: everything in Sidekick plus hand wax or sealant, full interior shampoo, leather conditioning and an engine bay wipe. 3 to 4 hours.
     - Legend, $449 and up: everything in Hero plus headlight restoration, an engine bay deep clean, pet hair removal and odor neutralization. 5 to 7 hours, depending on the vehicle’s size and condition.
     - The Patrol, $159 a month: two visits a month, every other week, covering the Sidekick list plus priority scheduling. Cancel anytime.
     - Trucks, SUVs, vans and oversized vehicles are priced on inspection.
   - The services:
     - exterior wash and wax: hand wash, clay-bar decontamination, foam soak, hand-applied carnauba wax;
     - interior detailing: vacuum, steam, shampoo, leather conditioning, crevices and cup holders;
     - headlight restoration: cloudy, yellow or hazy lenses made clear again.
   - How often: Sidekick-level upkeep once or twice a month, which is what The Patrol is built around; a Hero every 2 to 3 months; a Legend twice a year, in spring and fall.
   - The towns the business itself lists: Gallatin, Hendersonville, Goodlettsville, Castalian Springs, Bethpage and Madison, which it describes as most of Sumner County and the north side of Davidson County. Anyone outside them is told to call or text anyway and ask.

   **Never invent** a job, a customer, a count of cars, a rating, a year founded, a guarantee, insurance, a product or brand, a service the site doesn’t list (no ceramic coating, no paint correction, no boat or RV detailing), a discount, a travel fee, a response time, or water reclamation. Never say he has worked in a particular town or street. For a place that is not one of the six listed towns, say plainly that it is outside the list and that a call or text settles whether the drive works. Never promise that it does. For the six listed towns, say they are on his list. No reviews and no stats from the about page.

2. **The place**, only `src/content/places.json` for its slug:
   - county and straight-line miles from Gallatin;
   - ACS 2020–2024 population and households;
   - renters (% of households);
   - housing by type (% single-family detached, % attached, % in buildings of 5 or more units, % mobile homes);
   - vehicles (% of households with none, % with 3 or more);
   - commuting (% of workers who work from home, % who drove alone; of those who commute, % with a one-way trip of 30 minutes or more, and of 45 or more).

   When `acsGeo` is a ZIP, the figures are for that ZIP area, and the page must say so once ("in the 37115 ZIP area"). Small places (under about 1,500 people) have wide margins of error. Say "about", "the estimate", "a rough figure", and never build a strong claim on a tiny sample (Walterhill, Norene, Greenvale, Mitchellville, New Deal, Graball). Bransford’s census-designated place records no residents. Say so honestly and build its page on its county, its distance and what is near it.

3. **No named neighborhoods, subdivisions, roads, highways, lakes, schools, landmarks, employers or history.** Neither file has them. No population rankings, no "fast-growing", no weather. General knowledge may be stated as general, never as a local rule. Examples: highway driving collects bug splatter and road film; sun and age cloud a plastic headlight lens; pet hair weaves into carpet; a car parked outside all day can be washed while its owner works.

## How each page reads

- **The competitor test.** Could another detailer publish the page unchanged for another town? Then it isn’t done. Build each page around what that place’s numbers imply for a detailer who comes to you. For example:
  - mostly single-family houses means driveway details;
  - a big share in apartment buildings means the lot is the workplace and nobody needs a hose;
  - many working from home means the car sits there on a weekday;
  - long commutes mean highway miles, road film and bug-streaked fronts, which suits the exterior work and The Patrol’s every-other-week rhythm;
  - many households with 3 or more vehicles means more than one car to price (trucks on inspection, a photo of each);
  - a high renter share, or many mobile homes, are facts to use where they fit;
  - the distance from Gallatin decides whether the place is on the business’s list or a call-first drive.

  Pick the two or three facts that stand out for that place compared with the others in `places.json`, and lead with them. Do not recite every number. The fact card shows them all.
- **Sections.** Each heading is a question someone there would type, and the first sentence of the body answers it. Each section runs 90–220 words, in paragraphs under 120 words, and each paragraph stands alone (never start with "This", "That’s why", "As mentioned"). Link 2–4 service pages inside the sections, the ones the facts point to:
  - `<a href="/mobile-detailing/">…</a>`
  - `<a href="/interior-detailing/">…</a>`
  - `<a href="/exterior-detailing/">…</a>`
  - `<a href="/headlight-restoration/">…</a>`
  - `<a href="/biweekly-detailing-plan/">…</a>`
  - `/#pricing`, `/#quote`, `/about`

  Vary the anchor text.
- **Named things.** Name at least three things beyond the business and the town on each page (the county, Gallatin, Maddox, a package name, a service, the Patrol plan, the state line for a Kentucky town), and use at least two real numbers from `places.json`.
- **FAQ.** Questions are phrased the way people type them and include the place name. Each answer starts with the answer. No question may repeat a question on another page, on the home page (`index.html` → `#faq`) or on `about.html`.
- **No sentence may appear twice**: on this site, across your batch, or anywhere else. Three other writers are doing other batches at the same time, so stay away from stock shapes. Vary the openings, the order the facts come in, the TL;DR’s structure, the section questions and the FAQ set. Never use a fill-in-the-name pattern. Read `index.html` and `about.html` for the voice, and so you don’t echo their sentences.
- **Voice.** Plain and specific: a young local detailer who knows cars, talking to a neighbor. A little warmth is welcome, but no comic-book shouting in this copy. Call him Maddox or he, and the business Chumbley’s.
- **Style rules.**
  - US English.
  - Curly apostrophes (’) and quotes inside strings, because straight apostrophes in single-quoted JS strings break the build.
  - No em-dash chains, and no exclamation marks.
  - Never use: "nestled", "vibrant", "boasts", "whether you’re", "look no further", "in today’s", "elevate", "top-notch", "second to none", "hassle-free", "peace of mind", "we’ve got you covered", "when it comes to".
  - Numbers as the data gives them: population with a comma; percent as "38 percent"; miles as "about 12 miles".
- **No tool names.** Never mention AI, a tool, Census Reporter or a website by name in the copy. "Census figures" or "the Census Bureau’s estimates" is fine. The fact card cites the sources.

When you’re finished:
- `node -e "import('./src/content/areas-<batch>.mjs').then(m=>console.log(Object.keys(m.COPY).length))"` must print your count;
- check that each blurb is 120–160 characters, each h1 is 18–42, each tldr is 40–110 words, each section is 90–220 words and each FAQ answer is 35–70 words. Fix any that fall outside.
