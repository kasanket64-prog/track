/*
  # Add detected_language to iot_data

  Stores the ISO 639-1 language code detected from the voice transcript
  (e.g. "en", "ar", "ur", "hi", "fr", "zh"). Allows filtering and
  reporting by language across multilingual sessions.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'iot_data' AND column_name = 'detected_language'
  ) THEN
    ALTER TABLE iot_data ADD COLUMN detected_language text DEFAULT 'en';
  END IF;
END $$;
