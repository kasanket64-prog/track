/*
  # Remove single-active-session enforcement

  Previously only one session could be active at a time.
  Now multiple sessions can run simultaneously.
  Remove the trigger and function that auto-paused other sessions.
*/

DROP TRIGGER IF EXISTS trg_single_active_session ON sessions;
DROP FUNCTION IF EXISTS pause_other_sessions();
