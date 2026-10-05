/*
# Create practice_feedback table (single-tenant, no auth)

1. New Tables
- `practice_feedback`
  - `id` (uuid, primary key, auto-generated)
  - `practice` (text, not null) — which practice was completed: 'calmer', 'focused', or 'energized'
  - `outcomes` (text[], not null, default '{}') — selected outcomes from: 'calmer', 'clearer', 'more_energized', 'no_real_change'
  - `feedback` (text, nullable) — optional written feedback from the user
  - `created_at` (timestamptz, default now()) — when the response was submitted

2. Security
- Enable RLS on `practice_feedback`.
- INSERT only for anon + authenticated (the app writes responses but cannot read them from the client).
- No SELECT / UPDATE / DELETE policies — responses are reviewed via the Supabase dashboard (service role bypasses RLS).

3. Important Notes
- This is a no-auth single-tenant app. The frontend uses the anon key.
- Only INSERT is exposed to the client; reading responses is done through the Supabase dashboard Table Editor.
- No personal information (name, email, age) is collected.
*/

CREATE TABLE IF NOT EXISTS practice_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice text NOT NULL CHECK (practice IN ('calmer', 'focused', 'energized')),
  outcomes text[] NOT NULL DEFAULT '{}',
  feedback text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE practice_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_feedback" ON practice_feedback;
CREATE POLICY "anon_insert_feedback"
ON practice_feedback FOR INSERT
TO anon, authenticated
WITH CHECK (true);
