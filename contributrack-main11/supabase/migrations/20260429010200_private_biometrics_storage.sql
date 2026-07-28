/*
  # Security fix: make member-biometrics storage bucket private

  ## Problem
  Face photos and voice samples were uploaded to the `member-biometrics`
  bucket and referenced via getPublicUrl(), i.e. a permanent,
  unauthenticated, guessable-if-leaked URL that works forever for anyone
  who has it, regardless of login state.

  ## Fix
  - Mark the bucket private (public = false). Files can no longer be
    fetched via their public URL.
  - Add storage.objects RLS policies scoped to `authenticated` only.
  - The application code now stores the *object path* in
    members.face_image_url / voice_sample_url (not a public URL) and
    generates short-lived signed URLs on demand when actually rendering
    an image/audio player (see src/lib/storage.ts).

  This migration only sets up the database/storage side. If the bucket
  does not already exist it is created here; if it exists from before,
  its `public` flag is flipped to false.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('member-biometrics', 'member-biometrics', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "Authenticated read member biometrics" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload member biometrics" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update member biometrics" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete member biometrics" ON storage.objects;

CREATE POLICY "Authenticated read member biometrics"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'member-biometrics');

CREATE POLICY "Authenticated upload member biometrics"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'member-biometrics');

CREATE POLICY "Authenticated update member biometrics"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'member-biometrics')
  WITH CHECK (bucket_id = 'member-biometrics');

CREATE POLICY "Authenticated delete member biometrics"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'member-biometrics');

-- NOTE: any face_image_url/voice_sample_url values saved *before* this
-- migration are old public URLs and will now 404 (bucket is private).
-- Re-upload each member's face photo / voice sample after this migration
-- runs; the app now stores the object path instead of a public URL and
-- resolves it to a short-lived signed URL at render time.
