/*
  # Add Face Expression & Engagement Intelligence to iot_data

  ## Summary
  Upgrades the IoT camera data model from a simple binary face-detected flag
  to a full facial engagement intelligence system.

  ## Problem Being Solved
  face=1 (face detected) previously meant "present and engaged". But a person
  can be detected by camera while sleeping, looking at their phone, or staring
  blankly. This migration captures the QUALITY of physical presence, not just
  the fact of it.

  ## New Columns on iot_data

  ### Face Expression
  - `face_expression` (text) — what the camera detected the face doing:
    - ENGAGED: alert, making eye contact, nodding, attentive
    - DISTRACTED: looking away, on phone, fidgeting
    - DROWSY: eyes drooping, head nodding, slow blinks — sleeping/half-asleep
    - NEUTRAL: face present, no strong expression signal
    - ABSENT: face not detected (face=0 equivalent, used when face=1 but person left briefly)

  ### Engagement Scoring
  - `engagement_score` (integer 0-100) — computed score combining voice + face expression:
    - ENGAGED + voice=1: 90-100
    - ENGAGED + voice=0: 65-75
    - NEUTRAL + voice=1: 55-65
    - NEUTRAL + voice=0: 35-45
    - DISTRACTED (any voice): 20-30
    - DROWSY (any voice): 5-15
    - ABSENT: 0

  ### Activity Tracking
  - `is_actively_engaged` (boolean) — true only when genuinely engaged (score >= 50)
  - `passive_presence` (boolean) — face detected but not engaged (present but checked out)

  ## Notes
  - All new columns are nullable/have defaults for backwards compatibility
  - The existing binary face=0/1 is preserved for API compatibility
  - engagement_score replaces contribution_pct as the ground truth for presence quality
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'iot_data' AND column_name = 'face_expression') THEN
    ALTER TABLE iot_data ADD COLUMN face_expression text DEFAULT 'NEUTRAL'
      CHECK (face_expression IN ('ENGAGED', 'DISTRACTED', 'DROWSY', 'NEUTRAL', 'ABSENT'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'iot_data' AND column_name = 'engagement_score') THEN
    ALTER TABLE iot_data ADD COLUMN engagement_score integer DEFAULT 50
      CHECK (engagement_score >= 0 AND engagement_score <= 100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'iot_data' AND column_name = 'is_actively_engaged') THEN
    ALTER TABLE iot_data ADD COLUMN is_actively_engaged boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'iot_data' AND column_name = 'passive_presence') THEN
    ALTER TABLE iot_data ADD COLUMN passive_presence boolean DEFAULT false;
  END IF;
END $$;
