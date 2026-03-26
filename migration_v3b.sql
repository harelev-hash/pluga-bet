-- Migration v3b: Add type field to tracking_events
-- Run in Supabase SQL Editor

ALTER TABLE tracking_events ADD COLUMN IF NOT EXISTS type TEXT;
