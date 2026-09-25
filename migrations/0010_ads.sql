-- Google Ads, for the Google Ads tab of /traffic (2026-09-24).
--
-- Written only by ~/fleet/skills/ads-report/scripts/ads-report.mjs sync, nightly, for
-- the sites whose Google Ads we run (site.json → services has "google-ads"). The push
-- creates these tables itself with the same statements, so a site pushed before this
-- migration ran is fine; applying it early just makes the empty tables exist.
--
-- A site with no rows in ads_meta is one we do not run ads for, and its Google Ads tab
-- says what we would do instead. Money is in the account's currency (dollars, not
-- micros). Every table is replaced day by day for the window the sync pulled, because
-- Google restates recent days as late conversions arrive.

CREATE TABLE IF NOT EXISTS ads_meta (key TEXT PRIMARY KEY, value TEXT);

CREATE TABLE IF NOT EXISTS ads_days (
  day TEXT PRIMARY KEY,
  cost REAL NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  conversions REAL NOT NULL DEFAULT 0,
  value REAL NOT NULL DEFAULT 0
);

-- eligible = impressions ÷ search impression share for the day; lost_budget and
-- lost_rank are eligible impressions lost to each. Summed over a window, they give
-- the window's share without averaging percentages.
CREATE TABLE IF NOT EXISTS ads_campaigns (
  day TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  name TEXT,
  status TEXT,
  channel TEXT,
  cost REAL NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  conversions REAL NOT NULL DEFAULT 0,
  eligible REAL,
  lost_budget REAL,
  lost_rank REAL,
  PRIMARY KEY (day, campaign_id)
);

CREATE TABLE IF NOT EXISTS ads_terms (
  day TEXT NOT NULL,
  term TEXT NOT NULL,
  cost REAL NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  conversions REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (day, term)
);

-- keyword_id is "<ad group id>~<criterion id>": criterion ids repeat across ad groups.
CREATE TABLE IF NOT EXISTS ads_keywords (
  day TEXT NOT NULL,
  keyword_id TEXT NOT NULL,
  ad_group TEXT,
  text TEXT,
  match TEXT,
  status TEXT,
  qs INTEGER,
  cost REAL NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  conversions REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (day, keyword_id)
);

CREATE TABLE IF NOT EXISTS ads_devices (
  day TEXT NOT NULL,
  device TEXT NOT NULL,
  cost REAL NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  conversions REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (day, device)
);

-- hour is the hour of day in the account's own time zone.
CREATE TABLE IF NOT EXISTS ads_hours (
  day TEXT NOT NULL,
  hour INTEGER NOT NULL,
  cost REAL NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  conversions REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (day, hour)
);

CREATE TABLE IF NOT EXISTS ads_actions (
  day TEXT NOT NULL,
  action TEXT NOT NULL,
  category TEXT,
  conversions REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (day, action)
);
