/*
  # Add FOCUSED to face_expression enum

  ## Why
  When a device is placed at the center of a group and members are working
  on laptops, they look DOWN — not at the camera. The previous model would
  classify them as NEUTRAL or DISTRACTED when they are actually productively
  working. FOCUSED resolves this ambiguity.

  ## Change
  - Drops the old CHECK constraint on face_expression
  - Adds a new CHECK constraint that includes 'FOCUSED'
  - FOCUSED means: face partially visible, person is looking at laptop/notebook,
    clearly working — high engagement even without direct camera eye contact

  ## Scoring impact
  FOCUSED base engagement = 65 (vs ENGAGED=80, NEUTRAL=50, DISTRACTED=20, DROWSY=8)
  With voice: can reach 80+
  is_actively_engaged: true when score >= 50 → FOCUSED always qualifies
*/

ALTER TABLE iot_data DROP CONSTRAINT IF EXISTS iot_data_face_expression_check;

ALTER TABLE iot_data ADD CONSTRAINT iot_data_face_expression_check
  CHECK (face_expression IN ('ENGAGED', 'FOCUSED', 'DISTRACTED', 'DROWSY', 'NEUTRAL', 'ABSENT'));
