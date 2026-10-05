/*
# Lock down practice_feedback to INSERT-only for anon/authenticated

1. Security Changes
- Revoke SELECT, UPDATE, DELETE table privileges from anon and authenticated roles.
- Only INSERT remains (the existing anon_insert_feedback INSERT policy allows writes).
- This ensures the frontend can submit feedback but cannot read, modify, or delete responses.
- Reading responses is done through the Supabase dashboard (service role bypasses RLS).
*/

REVOKE SELECT, UPDATE, DELETE ON practice_feedback FROM anon;
REVOKE SELECT, UPDATE, DELETE ON practice_feedback FROM authenticated;
