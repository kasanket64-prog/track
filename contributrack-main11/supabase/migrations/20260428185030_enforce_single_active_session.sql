/*
  # Enforce Single Active Session

  ## Purpose
  Ensures only one session can be in 'active' status at any time.
  When a session is set to 'active', all other active sessions are automatically paused.

  ## Changes
  - Adds a DB function and trigger that pauses all other sessions before activating one.
*/

CREATE OR REPLACE FUNCTION pause_other_sessions()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' THEN
    UPDATE sessions
    SET status = 'paused'
    WHERE id != NEW.id AND status = 'active';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_single_active_session ON sessions;
CREATE TRIGGER trg_single_active_session
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION pause_other_sessions();
