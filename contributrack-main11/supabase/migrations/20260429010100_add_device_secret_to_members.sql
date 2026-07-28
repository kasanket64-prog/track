/*
  # Security fix: per-device shared secret for IoT ingestion

  ## Problem
  The `iot-data` edge function accepted any POST body containing a
  `device_id`, with only the public anon key required to call the
  function at all (and that key ships inside the client bundle, so it is
  not a secret). Anyone could POST fabricated voice/face/transcript data
  for any real device_id, silently overwriting a member's engagement
  history.

  ## Fix
  Every member now has a `device_secret` generated at creation time. The
  IoT device must send this secret with each reading; the edge function
  rejects the request if it is missing or does not match the member
  currently paired to that `device_id`.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE members ADD COLUMN IF NOT EXISTS device_secret text DEFAULT encode(gen_random_bytes(18), 'base64');

-- Backfill any existing rows created before this column existed.
UPDATE members SET device_secret = encode(gen_random_bytes(18), 'base64') WHERE device_secret IS NULL;
