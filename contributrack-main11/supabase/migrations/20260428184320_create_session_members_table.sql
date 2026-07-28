/*
  # Session Members Junction Table

  ## Purpose
  Links members to sessions so you can track exactly who is working on which session/project.

  ## New Tables
  - `session_members`
    - `id` (uuid, pk)
    - `session_id` (uuid, fk → sessions)
    - `member_id` (uuid, fk → members)
    - `joined_at` (timestamptz) — when they were assigned to the session
    - Unique constraint: one row per (session, member) pair

  ## Security
  - RLS enabled, public read/insert/delete for project tracking tool
*/

CREATE TABLE IF NOT EXISTS session_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  UNIQUE (session_id, member_id)
);

ALTER TABLE session_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read session_members"
  ON session_members FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert session_members"
  ON session_members FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public delete session_members"
  ON session_members FOR DELETE
  TO anon, authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_session_members_session_id ON session_members(session_id);
CREATE INDEX IF NOT EXISTS idx_session_members_member_id ON session_members(member_id);
