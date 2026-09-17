-- Where visitors actually are, to the town.
--
-- Cloudflare populates all of this at the edge on our plan — we were keeping
-- the country and discarding the rest. Additive, so nothing already logged
-- changes; these fill from the moment this deploys and cannot be backfilled,
-- because the request that carried them is long gone.
--
-- City is the IP's REGISTERED location, which is frequently the ISP's hub
-- rather than the visitor's own town. It is honest in aggregate — "we are
-- pulling from Rutherford County now" — and misleading read one row at a time,
-- so the panel that shows it says so.
--
-- No IP address is stored, here or anywhere else.
ALTER TABLE pageviews ADD COLUMN city   TEXT;
ALTER TABLE pageviews ADD COLUMN region TEXT;   -- state, spelled out
ALTER TABLE pageviews ADD COLUMN metro  TEXT;   -- Nielsen DMA, for ad targeting
-- The network operator: separates a residential visitor from a datacenter or a
-- VPN exit, which is a bot signal the user agent alone will not give you.
ALTER TABLE pageviews ADD COLUMN isp    TEXT;
