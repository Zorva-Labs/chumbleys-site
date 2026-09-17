-- Traffic analytics tables, first-party. Modeled on the National Closet
-- Company and Nashville's Web Design setups.
--
-- Everything here is written by the Worker itself, at the edge, before a
-- single line of browser JavaScript runs. Ad blockers, consent banners and
-- Safari's tracking prevention cannot touch it — which is the whole point.
-- Google Analytics routinely reports 20-40% less than this because a good
-- share of visitors never load google-analytics.com at all.
--
-- No third-party script means no cookie banner to serve and nothing for a
-- blocker to recognize.

CREATE TABLE IF NOT EXISTS pageviews (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  path          TEXT    NOT NULL,
  channel       TEXT,              -- acquisition channel, entries only
  referrer_host TEXT,
  utm_source    TEXT,
  utm_medium    TEXT,
  gclid         INTEGER NOT NULL DEFAULT 0,
  country       TEXT,
  -- 1 = session-starting hit (external or empty referrer). 0 = a click from
  -- one of our own pages. Only entries carry a channel, so "how did they find
  -- us" is not inflated by people browsing around the site.
  is_entry      INTEGER NOT NULL DEFAULT 0,
  -- Crawlers are logged rather than dropped. Which AI crawlers are reading the
  -- site is the only direct evidence the AEO/GEO work is landing, and no
  -- off-the-shelf analytics tool will show it. The dashboard reports humans
  -- and bots separately so neither number is polluted by the other.
  is_bot        INTEGER NOT NULL DEFAULT 0,
  bot_name      TEXT,
  device        TEXT               -- mobile | tablet | desktop
);

CREATE INDEX IF NOT EXISTS idx_pv_created ON pageviews (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pv_path    ON pageviews (path);
CREATE INDEX IF NOT EXISTS idx_pv_entry   ON pageviews (is_entry, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pv_bot     ON pageviews (is_bot, created_at DESC);

-- Active seconds per page view, from the first-party beacon.
-- pvid is UNIQUE so repeated reports for the same page view update in place
-- rather than inserting duplicates — the beacon reports a running total
-- several times per visit and we keep the largest.
CREATE TABLE IF NOT EXISTS page_engagement (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  pvid       TEXT    UNIQUE,
  path       TEXT    NOT NULL,
  seconds    INTEGER NOT NULL,
  country    TEXT
);

CREATE INDEX IF NOT EXISTS idx_pe_created ON page_engagement (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pe_path    ON page_engagement (path);

-- Conversions. There is no CRM on this site — the estimate forms post to
-- FormSubmit — so this table is where "did the traffic actually do anything"
-- lives. For most local businesses a lead is a phone call, not a form, so
-- tap-to-call is
-- tracked as a first-class event rather than an afterthought.
CREATE TABLE IF NOT EXISTS events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  name       TEXT    NOT NULL,     -- call | email | form_submit | form_complete | directions
  path       TEXT,                 -- page the visitor was on
  detail     TEXT,                 -- e.g. the service picked in the form
  country    TEXT
);

CREATE INDEX IF NOT EXISTS idx_ev_created ON events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ev_name    ON events (name, created_at DESC);
