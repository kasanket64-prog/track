# Fixes applied

## 1. Anyone could read/write all data — no auth required (critical)
Every table's RLS policy granted access to `anon` (unauthenticated) as well
as `authenticated`, and the "Continue as Guest" button skipped Supabase auth
entirely. Combined, anyone who opened the site — logged in or not — had
full CRUD on every member's biometric data, transcripts, and scores.

- `supabase/migrations/20260429010000_lock_down_rls_to_authenticated.sql`
  drops every anon-inclusive policy and rebuilds it scoped to `authenticated`
  only.
- `src/pages/Auth.tsx`: removed the guest-access bypass.

**Action needed:** run the new migrations against your Supabase project
(`supabase db push` or via the dashboard) and make sure every real user of
the tool has a Supabase Auth account.

## 2. IoT ingestion endpoint accepted data for any device (critical)
`iot-data` only required the public (client-bundled) anon key, so anyone
could POST fabricated voice/face readings for any `device_id`.

- Added `members.device_secret` (migration `20260429010100_...sql`), issued
  per member/device pairing.
- `supabase/functions/iot-data/index.ts` now requires a matching
  `device_secret` (body field or `X-Device-Secret` header) before accepting
  a reading.
- `src/pages/Members.tsx`: new "Device Secret" field on the edit form —
  reveal / copy / regenerate.
- `src/pages/IoTDevice.tsx`: test panel and generated curl command now
  include the paired member's secret.

**Action needed:** re-pair any already-deployed physical devices with the
new secret shown in the Members page.

## 3. Face photos / voice samples were permanently public (high)
Biometric files were uploaded with `getPublicUrl()` — a permanent,
unauthenticated link that works forever for anyone who has it.

- `supabase/migrations/20260429010200_private_biometrics_storage.sql` makes
  the `member-biometrics` bucket private with `authenticated`-only RLS.
- `src/lib/storage.ts` (new) resolves a stored object path to a 1-hour
  signed URL on demand.
- `src/pages/Members.tsx` now stores the object path (not a public URL) and
  renders images/audio through `SignedBioImage` / `SignedBioAudio`.

**Action needed:** any face photo / voice sample uploaded *before* this fix
is now a dead public URL (bucket is private) — re-upload it from the
Members page.

## 4. Two edge functions leaked data to anyone holding the anon key (high)
Both `iot-data` (GET) and `analyze-contribution` query with the
**service-role** key, which bypasses RLS. Since only the public anon key was
required to invoke the functions at all, both endpoints returned data to any
visitor regardless of the RLS fix above — `analyze-contribution`'s response
even includes each member's AI narrative and sampled transcripts.

- Both functions now verify the caller's bearer token against a real
  Supabase Auth user via `auth.getUser()`, returning 401 otherwise.
- `src/pages/Dashboard.tsx` now sends the signed-in user's session token
  (not the anon key) as the bearer when calling `analyze-contribution`.

## 5. `analyze-contribution` could silently corrupt insight data (medium)
- `clamp()` used `v ?? 0`, which does not catch `NaN` — a malformed Claude
  response could reach the DB and violate a CHECK constraint, throwing
  mid-loop after other members' rows had already been deleted. Fixed with
  an explicit `Number.isFinite` check.
- The delete-then-insert per member is now wrapped per-member in its own
  try/catch, so one failure only skips that member (reported in a
  `failures` array) instead of aborting the whole batch.

## 6. Full Claude re-analysis fired on every single sensor reading (medium)
`Dashboard.tsx` re-ran the (sequential, per-member, Opus-model) analysis on
every realtime insert, every 3s poll tick, and a 2-minute timer, with no
guard against overlap.

- Added an in-flight lock (`analyzingRef`) so runs can't stack.
- Realtime inserts now debounce into a single analysis 10s after the last
  event, instead of one full re-analysis per row.

---

Not addressed (out of scope for a direct fix, flagging for awareness):
- There's still no per-user ownership model — any signed-in user can see
  and edit any other member's data. That matches the app's original design
  intent (a shared team tool), so it wasn't changed, but worth confirming
  that's actually what you want given the sensitivity of the data involved.
- No visible consent flow for members being recorded/scored by camera and
  microphone. Worth adding before deploying with real people.
- `README.md` is still empty.
