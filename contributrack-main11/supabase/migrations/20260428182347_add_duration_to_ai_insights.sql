/*
  # Add session duration and active time to ai_insights

  Adds columns so Claude's analysis can factor in how long each member was
  active across sessions.

  ## Changes to ai_insights
  - `session_duration_minutes` (numeric) — total minutes member was in sessions
  - `active_time_minutes` (numeric) — minutes where face OR voice was detected
  - `doc_count` (integer) — number of documents submitted
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_insights' AND column_name = 'session_duration_minutes'
  ) THEN
    ALTER TABLE ai_insights ADD COLUMN session_duration_minutes numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_insights' AND column_name = 'active_time_minutes'
  ) THEN
    ALTER TABLE ai_insights ADD COLUMN active_time_minutes numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_insights' AND column_name = 'doc_count'
  ) THEN
    ALTER TABLE ai_insights ADD COLUMN doc_count integer DEFAULT 0;
  END IF;
END $$;
