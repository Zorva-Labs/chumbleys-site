-- The network's number and the user agent on each page view (traffic-kit, 2026-09-25). pageviews kept only the
-- network's name, so a rule decided later could only be backfilled by name and time, and a user agent never.
-- Nullable, so a middleware that doesn't write them yet keeps working. Still no IP.
ALTER TABLE pageviews ADD COLUMN asn INTEGER;
ALTER TABLE pageviews ADD COLUMN ua TEXT;
