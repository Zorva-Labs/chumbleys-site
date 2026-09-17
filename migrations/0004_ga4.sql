/* Google Analytics figures for THIS site.
 *
 * Written by the central ingest, read only by this site's own dashboard — the
 * same physical tenancy as the ranking tables. No site can query another's
 * numbers because they are not in the same database, rather than because a
 * WHERE clause was remembered.
 *
 * Deliberately a summary, not a copy of GA4. Anything richer belongs in
 * Analytics itself, which is one click away and always more current than a
 * nightly copy of it.
 */
CREATE TABLE IF NOT EXISTS ga4_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ga4_days (
  day      TEXT PRIMARY KEY,          -- YYYY-MM-DD
  sessions INTEGER NOT NULL DEFAULT 0,
  users    INTEGER NOT NULL DEFAULT 0,
  views    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ga4_channels (
  day      TEXT NOT NULL,
  channel  TEXT NOT NULL,
  sessions INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, channel)
);

-- The per-dimension breakdowns behind the Analytics cards: views by page,
-- sessions by channel, events, new users, country, device.
--
-- Declared here rather than left to the ingest to create on first run. The
-- ingest does issue CREATE TABLE IF NOT EXISTS, which is why this was missed
-- for so long: the table appeared in production and in no migration, so a
-- checker reading the schema could not tell a site that was set up correctly
-- from one that had simply never been ingested.
--
-- `prev` is the same metric over the preceding window of equal length, so each
-- card can show its change without a second query — and so the comparison is
-- Google's arithmetic over one request rather than ours across two.
CREATE TABLE IF NOT EXISTS ga4_dims (
  kind  TEXT    NOT NULL,          -- page | channel | country | event | newuser | device
  label TEXT    NOT NULL,
  value INTEGER NOT NULL DEFAULT 0,
  prev  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (kind, label)
);
