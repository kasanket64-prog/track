/*
  # Security fix: require real authentication for all data access

  ## Problem
  Every table's RLS policies previously granted access to the `anon` role
  (i.e. anyone who can reach the API, logged in or not) as well as
  `authenticated`. Combined with the "Continue as Guest" button (which never
  calls Supabase auth), this meant every visitor to the site — with no
  login at all — had full read/write/delete access to every member's
  biometric data (face photos, voice samples), voice transcripts, and
  engagement/drowsiness scores.

  ## Fix
  Drop every "public"/anon-inclusive policy and recreate it scoped to the
  `authenticated` role only. This app has no per-user ownership model
  (any signed-in teammate can see/edit any record, by design — see the
  original schema migration's notes), so policies still use `USING (true)`
  for authenticated users. The fix is removing the `anon` grant, not adding
  row ownership.

  ## Tables affected
  members, sessions, iot_data, documents, ai_insights, session_members
*/

-- members ---------------------------------------------------------------
DROP POLICY IF EXISTS "Allow public read members" ON members;
DROP POLICY IF EXISTS "Allow authenticated insert members" ON members;
DROP POLICY IF EXISTS "Allow authenticated update members" ON members;
DROP POLICY IF EXISTS "Allow authenticated delete members" ON members;

CREATE POLICY "Authenticated read members"
  ON members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated insert members"
  ON members FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated update members"
  ON members FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated delete members"
  ON members FOR DELETE
  TO authenticated
  USING (true);

-- sessions ----------------------------------------------------------------
DROP POLICY IF EXISTS "Allow public read sessions" ON sessions;
DROP POLICY IF EXISTS "Allow public insert sessions" ON sessions;
DROP POLICY IF EXISTS "Allow public update sessions" ON sessions;
DROP POLICY IF EXISTS "Allow public delete sessions" ON sessions;

CREATE POLICY "Authenticated read sessions"
  ON sessions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated insert sessions"
  ON sessions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated update sessions"
  ON sessions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated delete sessions"
  ON sessions FOR DELETE
  TO authenticated
  USING (true);

-- iot_data ------------------------------------------------------------------
-- Note: rows are written by the iot-data edge function using the SERVICE
-- ROLE key, which bypasses RLS entirely — so removing anon/authenticated
-- insert here does not break ingestion. It only stops browser clients from
-- inserting fabricated readings directly against the table.
DROP POLICY IF EXISTS "Allow public read iot_data" ON iot_data;
DROP POLICY IF EXISTS "Allow public insert iot_data" ON iot_data;

CREATE POLICY "Authenticated read iot_data"
  ON iot_data FOR SELECT
  TO authenticated
  USING (true);

-- documents -----------------------------------------------------------------
DROP POLICY IF EXISTS "Allow public read documents" ON documents;
DROP POLICY IF EXISTS "Allow public insert documents" ON documents;
DROP POLICY IF EXISTS "Allow public delete documents" ON documents;

CREATE POLICY "Authenticated read documents"
  ON documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated insert documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated delete documents"
  ON documents FOR DELETE
  TO authenticated
  USING (true);

-- ai_insights -----------------------------------------------------------------
-- Written by the analyze-contribution edge function using the SERVICE ROLE
-- key, so it does not need an authenticated/anon insert policy either.
DROP POLICY IF EXISTS "Allow public read ai_insights" ON ai_insights;
DROP POLICY IF EXISTS "Allow public insert ai_insights" ON ai_insights;
DROP POLICY IF EXISTS "Allow public delete ai_insights" ON ai_insights;

CREATE POLICY "Authenticated read ai_insights"
  ON ai_insights FOR SELECT
  TO authenticated
  USING (true);

-- session_members -----------------------------------------------------------
DROP POLICY IF EXISTS "Allow public read session_members" ON session_members;
DROP POLICY IF EXISTS "Allow public insert session_members" ON session_members;
DROP POLICY IF EXISTS "Allow public delete session_members" ON session_members;

CREATE POLICY "Authenticated read session_members"
  ON session_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated insert session_members"
  ON session_members FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated delete session_members"
  ON session_members FOR DELETE
  TO authenticated
  USING (true);
