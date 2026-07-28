/*
  # ContribuTrack - Full Schema

  ## Tables Created:
  1. `members` - Project team members with device ID for IoT tracking
  2. `sessions` - Project work sessions with status and timeline
  3. `iot_data` - IoT sensor readings (voice/face) with computed contribution levels
  4. `documents` - Uploaded documents with analysis results

  ## Security:
  - RLS enabled on all tables
  - Public read/write policies (project tracking tool, no per-user isolation needed)
  - Service role used for IoT edge function inserts

  ## Notes:
  - contribution_level computed from voice+face: HIGH/MEDIUM/LOW
  - contribution_pct: HIGH=100, MEDIUM=60, LOW=20
  - fairness_score derived in frontend from std dev of contributions
*/

-- Members table
CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  role text DEFAULT 'member',
  device_id text UNIQUE,
  avatar_color text DEFAULT '#3B82F6',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read members"
  ON members FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert members"
  ON members FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update members"
  ON members FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated delete members"
  ON members FOR DELETE
  TO anon, authenticated
  USING (true);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  status text DEFAULT 'active',
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read sessions"
  ON sessions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert sessions"
  ON sessions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update sessions"
  ON sessions FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete sessions"
  ON sessions FOR DELETE
  TO anon, authenticated
  USING (true);

-- IoT data table
CREATE TABLE IF NOT EXISTS iot_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  member_id uuid REFERENCES members(id) ON DELETE SET NULL,
  voice integer DEFAULT 0 CHECK (voice IN (0,1)),
  face integer DEFAULT 0 CHECK (face IN (0,1)),
  session_id uuid REFERENCES sessions(id) ON DELETE SET NULL,
  contribution_level text DEFAULT 'LOW' CHECK (contribution_level IN ('HIGH','MEDIUM','LOW')),
  contribution_pct integer DEFAULT 20,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE iot_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read iot_data"
  ON iot_data FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert iot_data"
  ON iot_data FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  file_type text DEFAULT 'text/plain',
  file_size integer DEFAULT 0,
  content text DEFAULT '',
  word_count integer DEFAULT 0,
  char_count integer DEFAULT 0,
  member_id uuid REFERENCES members(id) ON DELETE SET NULL,
  analysis_result jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read documents"
  ON documents FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert documents"
  ON documents FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public delete documents"
  ON documents FOR DELETE
  TO anon, authenticated
  USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_iot_data_device_id ON iot_data(device_id);
CREATE INDEX IF NOT EXISTS idx_iot_data_created_at ON iot_data(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_iot_data_member_id ON iot_data(member_id);
CREATE INDEX IF NOT EXISTS idx_members_device_id ON members(device_id);
