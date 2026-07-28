/*
  # Add Biometric Profile Fields to Members

  ## Purpose
  The AI needs a reference face image and voice sample for each member so it can
  match incoming IoT sensor data (face detection, voice activity) to the correct person.

  ## Changes to `members` table
  - `face_image_url`  — public URL of the member's reference face photo stored in Supabase Storage
  - `voice_sample_url` — public URL of the member's reference voice audio stored in Supabase Storage
  - `voice_label`     — short identifier the voice-recognition model uses (e.g. "alice_j")
  - `face_label`      — short identifier the face-recognition model uses (e.g. "alice_j")

  ## Notes
  - Labels are auto-derived from the member's name but can be overridden
  - URLs are set after file upload to the `member-biometrics` storage bucket
  - Existing members get NULL values — biometrics are optional but recommended
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='members' AND column_name='face_image_url') THEN
    ALTER TABLE members ADD COLUMN face_image_url text DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='members' AND column_name='voice_sample_url') THEN
    ALTER TABLE members ADD COLUMN voice_sample_url text DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='members' AND column_name='voice_label') THEN
    ALTER TABLE members ADD COLUMN voice_label text DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='members' AND column_name='face_label') THEN
    ALTER TABLE members ADD COLUMN face_label text DEFAULT NULL;
  END IF;
END $$;
