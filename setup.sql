-- ============================================================
-- Anthony William Detter Memorial — Supabase Setup
-- Run this entire file in Supabase → SQL Editor → New query
-- ============================================================

-- ── Tables ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS messages (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text        NOT NULL,
  message    text        NOT NULL,
  photo_url  text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gallery_photos (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  url        text        NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS candles (
  id    int  PRIMARY KEY DEFAULT 1,
  count int  DEFAULT 0
);

-- Seed candle row
INSERT INTO candles (id, count) VALUES (1, 0) ON CONFLICT DO NOTHING;

-- ── Row Level Security ───────────────────────────────────────

ALTER TABLE messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE candles        ENABLE ROW LEVEL SECURITY;

-- Messages
CREATE POLICY "Public read messages"   ON messages       FOR SELECT USING (true);
CREATE POLICY "Public insert messages" ON messages       FOR INSERT WITH CHECK (true);

-- Gallery
CREATE POLICY "Public read gallery"    ON gallery_photos FOR SELECT USING (true);
CREATE POLICY "Public insert gallery"  ON gallery_photos FOR INSERT WITH CHECK (true);

-- Candles
CREATE POLICY "Public read candles"    ON candles        FOR SELECT USING (true);
CREATE POLICY "Public update candles"  ON candles        FOR UPDATE USING (true);

-- ── Storage Bucket ───────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('memorial-photos', 'memorial-photos', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "Public read photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'memorial-photos');

CREATE POLICY "Public upload photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'memorial-photos');

-- ── Candle Increment Function ────────────────────────────────

CREATE OR REPLACE FUNCTION increment_candles()
RETURNS void AS $$
  UPDATE candles SET count = count + 1 WHERE id = 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- ── Real-time ────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE gallery_photos;
ALTER PUBLICATION supabase_realtime ADD TABLE candles;
