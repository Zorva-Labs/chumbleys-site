-- Its own file: on a fresh database the column does not exist until the ALTER
-- above runs, and on an existing one that file aborts at the first duplicate
-- column before reaching the end.
CREATE INDEX IF NOT EXISTS idx_pv_city ON pageviews (city, created_at DESC);
