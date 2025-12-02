-- SQL schema for MapleMind
-- Run this in your Supabase SQL editor or via psql connected to DATABASE_URL

create table if not exists profiles (
  id uuid primary key,
  full_name text,
  role text default 'student',
  grade_level text,
  preferred_subjects text[],
  created_at timestamp with time zone default timezone('utc', now())
);

create table if not exists study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  subject text,
  level text,
  goal text,
  started_at timestamp with time zone default timezone('utc', now()),
  ended_at timestamp with time zone
);

create table if not exists messages (
  id bigserial primary key,
  session_id uuid references study_sessions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  sender text,
  content text,
  created_at timestamp with time zone default timezone('utc', now())
);

create table if not exists quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  session_id uuid references study_sessions(id),
  subject text,
  total_questions int,
  correct_answers int,
  score numeric,
  created_at timestamp with time zone default timezone('utc', now())
);

create table if not exists quiz_questions (
  id bigserial primary key,
  quiz_attempt_id uuid references quiz_attempts(id) on delete cascade,
  question_text text,
  user_answer text,
  correct_answer text,
  is_correct boolean
);

create table if not exists leaderboard (
  id bigserial primary key,
  user_id uuid references auth.users(id),
  subject text default 'global',
  points int default 0,
  updated_at timestamp with time zone default timezone('utc', now())
);

-- RLS and policies (examples). Enable RLS and then add policies.
-- Enable RLS on tables that store private user data
-- ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "users can manage own sessions" ON study_sessions USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Similar policies for messages and quiz_attempts

-- Helpful: ensure pgcrypto for gen_random_uuid()
create extension if not exists pgcrypto;

-- Enable Row Level Security and policies
ALTER TABLE IF EXISTS study_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "study_sessions_owner" ON study_sessions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

ALTER TABLE IF EXISTS messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "messages_owner" ON messages
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

ALTER TABLE IF EXISTS quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "quiz_attempts_owner" ON quiz_attempts
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "profiles_owner" ON profiles
  FOR ALL
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Leaderboard: readable by everyone, but updates/inserts should be performed server-side
ALTER TABLE IF EXISTS leaderboard ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "leaderboard_public_select" ON leaderboard
  FOR SELECT
  USING (true);

-- Do NOT create INSERT/UPDATE policies for `leaderboard` for client users.
-- The application backend should update the leaderboard using the SUPABASE_SERVICE_ROLE_KEY
-- which bypasses RLS. This prevents clients from arbitrarily changing points.

-- Helpful views/indexes
CREATE INDEX IF NOT EXISTS leaderboard_points_idx ON leaderboard(points DESC);

