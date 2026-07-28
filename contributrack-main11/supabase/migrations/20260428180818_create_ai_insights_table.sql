/*
  # AI Insights Table

  ## Purpose
  Stores per-member AI-generated contribution analysis results.
  Each row is one analysis snapshot for one member in one session context.

  ## New Tables
  - `ai_insights`
    - `id` (uuid, pk)
    - `member_id` (uuid, fk → members)
    - `session_id` (uuid, fk → sessions, nullable — null means all-time analysis)
    - `overall_score` (integer 0-100) — composite AI contribution score
    - `engagement_level` (text) — HIGH / MEDIUM / LOW
    - `voice_score` (integer 0-100) — derived from IoT voice readings
    - `presence_score` (integer 0-100) — derived from IoT face readings
    - `writing_score` (integer 0-100) — derived from document word counts
    - `consistency_score` (integer 0-100) — how consistent across readings
    - `narrative` (text) — AI-generated plain-English summary
    - `strengths` (jsonb) — array of strength strings
    - `improvements` (jsonb) — array of improvement suggestions
    - `reading_count` (integer) — number of IoT readings analysed
    - `word_count` (integer) — total words written
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled, public read/insert for demo tool
*/

CREATE TABLE IF NOT EXISTS ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  session_id uuid REFERENCES sessions(id) ON DELETE SET NULL,
  overall_score integer DEFAULT 0 CHECK (overall_score BETWEEN 0 AND 100),
  engagement_level text DEFAULT 'LOW' CHECK (engagement_level IN ('HIGH', 'MEDIUM', 'LOW')),
  voice_score integer DEFAULT 0 CHECK (voice_score BETWEEN 0 AND 100),
  presence_score integer DEFAULT 0 CHECK (presence_score BETWEEN 0 AND 100),
  writing_score integer DEFAULT 0 CHECK (writing_score BETWEEN 0 AND 100),
  consistency_score integer DEFAULT 0 CHECK (consistency_score BETWEEN 0 AND 100),
  narrative text DEFAULT '',
  strengths jsonb DEFAULT '[]',
  improvements jsonb DEFAULT '[]',
  reading_count integer DEFAULT 0,
  word_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read ai_insights"
  ON ai_insights FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert ai_insights"
  ON ai_insights FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public delete ai_insights"
  ON ai_insights FOR DELETE
  TO anon, authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_ai_insights_member_id ON ai_insights(member_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_created_at ON ai_insights(created_at DESC);
