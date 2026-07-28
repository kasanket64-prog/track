/*
  # Add voice_content_score to ai_insights

  Adds a dedicated voice content quality score column to ai_insights.
  This score reflects the actual quality of what members said (productive,
  neutral, off-topic, disruptive) rather than just how much they spoke.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_insights' AND column_name = 'voice_content_score'
  ) THEN
    ALTER TABLE ai_insights ADD COLUMN voice_content_score integer DEFAULT 0
      CHECK (voice_content_score >= 0 AND voice_content_score <= 100);
  END IF;
END $$;
