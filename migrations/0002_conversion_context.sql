-- Acquisition context on the conversion itself.
--
-- Channel, referrer and GCLID were only ever recorded on `pageviews`, and there
-- is no session id to join the two tables on — so a conversion could be counted
-- but never attributed. These columns are written at insert time from a
-- first-party cookie the edge middleware sets on the visitor's entry hit, which
-- the same-origin beacon POST carries back automatically.

ALTER TABLE events ADD COLUMN channel       TEXT;  -- Google Ads | Google organic | AI search | Direct …
ALTER TABLE events ADD COLUMN referrer_host TEXT;  -- host that sent them, when there was one
ALTER TABLE events ADD COLUMN gclid         INTEGER DEFAULT 0;  -- arrived on a Google Ads click
ALTER TABLE events ADD COLUMN landing       TEXT;  -- the page they entered the site on
ALTER TABLE events ADD COLUMN device        TEXT;  -- mobile | tablet | desktop
ALTER TABLE events ADD COLUMN first_seen    TEXT;  -- when the visit started, for time-to-convert

CREATE INDEX IF NOT EXISTS idx_ev_channel ON events (channel, created_at DESC);
