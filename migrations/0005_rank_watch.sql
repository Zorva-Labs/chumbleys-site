-- Target keywords: the searches we have set out to win for this site.
--
-- Kept separate from rank_snapshots because a target is a decision we made,
-- not something Google reported. A term with no snapshot row is the normal
-- and most useful state — it means the site is not ranking for it yet, and
-- the first week it appears is the result worth showing a client.
CREATE TABLE IF NOT EXISTS rank_watch (
  query    TEXT NOT NULL PRIMARY KEY,
  label    TEXT,
  note     TEXT,
  added_at TEXT NOT NULL
) WITHOUT ROWID;
