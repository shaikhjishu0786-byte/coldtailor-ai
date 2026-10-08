/*
# Create profiles table for cloud-synced trial tracking

1. New Tables
- `profiles`
  - `id` (uuid, primary key, matches auth.users.id)
  - `email` (text, the user's email from auth)
  - `role` (text, either 'jobseeker' or 'recruiter' — set at signup)
  - `trials_used` (integer, default 0 — how many free AI tailors the user has consumed)
  - `is_pro` (boolean, default false — whether the user has an active Pro subscription)
  - `tier` (text, default 'free' — the user's current subscription tier)
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on `profiles`.
- Each authenticated user can only read and update their own profile row.
- A trigger auto-creates a profile row when a new auth user signs up.
- The `trials_used` increment is done via an UPDATE policy that only allows the owner to update their own row.

3. Important Notes
- The `trials_used` column is the single source of truth for free trial credits.
- Free users get exactly 2 tailoring credits (enforced in application code by reading this value).
- Pro users (`is_pro = true`) bypass all credit limits.
- The role column determines which workspace the user lands in after login.
*/

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'jobseeker' CHECK (role IN ('jobseeker', 'recruiter')),
  trials_used integer NOT NULL DEFAULT 0,
  is_pro boolean NOT NULL DEFAULT false,
  tier text NOT NULL DEFAULT 'free',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Auto-create a profile row when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'jobseeker')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();