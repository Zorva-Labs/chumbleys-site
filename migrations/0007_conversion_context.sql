-- Everything the edge knows at the moment someone converts.
--
-- A conversion is a lead the business is about to phone, so the context that
-- produced it is worth keeping in full: where they were, what brought them,
-- what they were reading, and how long they took to decide.
--
-- Age and gender are NOT here and cannot be. Cloudflare carries no
-- demographics, and GA4 only reports them in thresholded aggregate with Google
-- Signals enabled — never joined to an individual conversion. A column for
-- them would only ever hold nulls or a guess.
ALTER TABLE events ADD COLUMN city       TEXT;
ALTER TABLE events ADD COLUMN region     TEXT;
ALTER TABLE events ADD COLUMN postal     TEXT;
ALTER TABLE events ADD COLUMN metro      TEXT;
ALTER TABLE events ADD COLUMN timezone   TEXT;
ALTER TABLE events ADD COLUMN isp        TEXT;
ALTER TABLE events ADD COLUMN asn        INTEGER;
ALTER TABLE events ADD COLUMN browser    TEXT;
ALTER TABLE events ADD COLUMN os         TEXT;
ALTER TABLE events ADD COLUMN language   TEXT;
ALTER TABLE events ADD COLUMN utm_source TEXT;
ALTER TABLE events ADD COLUMN utm_medium TEXT;
