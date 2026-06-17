-- ============================================================
-- FIX: Enable Event Photo uploads
-- Run this entire file in Supabase → SQL Editor → New query → Run
-- Safe to re-run (uses IF NOT EXISTS / OR REPLACE).
-- ============================================================

-- 1. Make sure the table exists with the columns the site expects
CREATE TABLE IF NOT EXISTS event_photos (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  url        text        NOT NULL,
  likes      int         DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- In case the table already existed without a likes column
ALTER TABLE event_photos ADD COLUMN IF NOT EXISTS likes int DEFAULT 0;

-- 2. Row Level Security + public policies (this is what was missing)
ALTER TABLE event_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read event_photos"   ON event_photos;
DROP POLICY IF EXISTS "Public insert event_photos" ON event_photos;

CREATE POLICY "Public read event_photos"   ON event_photos FOR SELECT USING (true);
CREATE POLICY "Public insert event_photos" ON event_photos FOR INSERT WITH CHECK (true);

-- 3. Like-counter function the site calls (db.rpc('increment_event_photo_likes'))
CREATE OR REPLACE FUNCTION increment_event_photo_likes(photo_id uuid)
RETURNS void AS $$
  UPDATE event_photos SET likes = likes + 1 WHERE id = photo_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- 4. Real-time so new photos appear live for everyone
ALTER PUBLICATION supabase_realtime ADD TABLE event_photos;
