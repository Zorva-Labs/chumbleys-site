-- Google rankings for this site, written weekly by the gsc-ingest Worker.
--
-- These land here rather than being read from the central gsc-rankings store,
-- and that is the security model, not a convenience. The /traffic gate is
-- per-site while the central store holds every client's keywords, and the
-- session cookie carries no site identity to filter on — so the endpoint keeps
-- reading env.DB and there is simply no site parameter for anyone to tamper
-- with. The database a client can reach contains only their data.
--
-- Populated by ~/gsc-ingest. A site with these tables empty is either newly
-- launched or not yet in site_targets there; the dashboard says which.

CREATE TABLE IF NOT EXISTS rank_snapshots (
  week_start  TEXT    NOT NULL,   -- Monday, ISO yyyy-mm-dd
  query       TEXT    NOT NULL,
  position    REAL    NOT NULL,
  impressions INTEGER NOT NULL,
  clicks      INTEGER NOT NULL,
  PRIMARY KEY (week_start, query)
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS idx_rs_week ON rank_snapshots (week_start);

-- Which page ranks for which query. The join that carries a search term
-- through to a phone call, since the events table already keys by path.
CREATE TABLE IF NOT EXISTS rank_pages (
  week_start  TEXT    NOT NULL,
  query       TEXT    NOT NULL,
  page        TEXT    NOT NULL,
  position    REAL    NOT NULL,
  impressions INTEGER NOT NULL,
  clicks      INTEGER NOT NULL,
  PRIMARY KEY (week_start, query, page)
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS idx_rp_page ON rank_pages (page, week_start);

-- Where each keyword started: written on first sighting, never updated. The
-- report's "was 18, now 4" comes from here, and it has to be a fact recorded
-- at the time rather than a number that can be re-picked later once we know
-- which keywords made us look good.
CREATE TABLE IF NOT EXISTS rank_baseline (
  query       TEXT    NOT NULL PRIMARY KEY,
  week_start  TEXT    NOT NULL,
  position    REAL    NOT NULL,
  impressions INTEGER NOT NULL,
  clicks      INTEGER NOT NULL
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS rank_meta (
  key   TEXT PRIMARY KEY,
  value TEXT
) WITHOUT ROWID;
