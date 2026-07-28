/*
  # Add Voice Analysis Fields to iot_data

  ## Summary
  Adds real-time voice content intelligence fields to the iot_data table.
  When an IoT device sends voice activity, it can now also send a transcript
  of what was said. The edge function then uses Claude to immediately analyse
  whether the speech is productive, relevant, and constructive.

  ## New Columns on iot_data
  - `transcript` (text, nullable) — raw speech-to-text output from the IoT device
  - `voice_quality` (text) — Claude's verdict: 'PRODUCTIVE' | 'NEUTRAL' | 'OFF_TOPIC' | 'DISRUPTIVE'
  - `voice_quality_score` (integer 0-100) — numerical quality score for charting
  - `voice_sentiment` (text) — 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE'
  - `voice_topics` (jsonb) — array of key topics detected in the transcript
  - `voice_flags` (jsonb) — array of warning flags (e.g. "off-topic", "filler-heavy", "disruptive")
  - `voice_summary` (text) — one-sentence Claude summary of what was said

  ## Notes
  - All new columns are nullable to preserve backwards compatibility
  - voice_quality defaults to 'NEUTRAL' when no transcript is provided
  - RLS policies already exist on this table; no changes needed
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'iot_data' AND column_name = 'transcript') THEN
    ALTER TABLE iot_data ADD COLUMN transcript text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'iot_data' AND column_name = 'voice_quality') THEN
    ALTER TABLE iot_data ADD COLUMN voice_quality text DEFAULT 'NEUTRAL'
      CHECK (voice_quality IN ('PRODUCTIVE', 'NEUTRAL', 'OFF_TOPIC', 'DISRUPTIVE'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'iot_data' AND column_name = 'voice_quality_score') THEN
    ALTER TABLE iot_data ADD COLUMN voice_quality_score integer DEFAULT 50
      CHECK (voice_quality_score >= 0 AND voice_quality_score <= 100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'iot_data' AND column_name = 'voice_sentiment') THEN
    ALTER TABLE iot_data ADD COLUMN voice_sentiment text DEFAULT 'NEUTRAL'
      CHECK (voice_sentiment IN ('POSITIVE', 'NEUTRAL', 'NEGATIVE'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'iot_data' AND column_name = 'voice_topics') THEN
    ALTER TABLE iot_data ADD COLUMN voice_topics jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'iot_data' AND column_name = 'voice_flags') THEN
    ALTER TABLE iot_data ADD COLUMN voice_flags jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'iot_data' AND column_name = 'voice_summary') THEN
    ALTER TABLE iot_data ADD COLUMN voice_summary text;
  END IF;
END $$;
