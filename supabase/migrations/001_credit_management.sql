-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Credit Management & Subscription Plans
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add subscription columns to the profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan            TEXT    NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS builds_used     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS builds_limit    INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS builds_reset_at TIMESTAMPTZ     DEFAULT (now() + INTERVAL '30 days'),
  ADD COLUMN IF NOT EXISTS video_used      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS video_limit     INTEGER NOT NULL DEFAULT 0;

-- 2. Add a check constraint to enforce valid plan values
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_plan_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_plan_check
  CHECK (plan IN ('free', 'starter', 'growth', 'pro'));

-- 3. Function: reset monthly builds when builds_reset_at has passed
CREATE OR REPLACE FUNCTION public.maybe_reset_builds()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.builds_reset_at IS NOT NULL AND NOW() > NEW.builds_reset_at THEN
    NEW.builds_used     := 0;
    NEW.video_used      := 0;
    NEW.builds_reset_at := NOW() + INTERVAL '30 days';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_maybe_reset_builds ON public.profiles;
CREATE TRIGGER trg_maybe_reset_builds
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.maybe_reset_builds();

-- 4. Function: set limits when plan changes
CREATE OR REPLACE FUNCTION public.set_plan_limits()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.plan IS DISTINCT FROM OLD.plan THEN
    CASE NEW.plan
      WHEN 'free'    THEN NEW.builds_limit := 3;  NEW.video_limit := 0;
      WHEN 'starter' THEN NEW.builds_limit := 10; NEW.video_limit := 0;
      WHEN 'growth'  THEN NEW.builds_limit := 50; NEW.video_limit := 5;
      WHEN 'pro'     THEN NEW.builds_limit := -1; NEW.video_limit := 25; -- -1 = unlimited
      ELSE NULL;
    END CASE;
    -- Reset usage when upgrading
    NEW.builds_used := 0;
    NEW.video_used  := 0;
    NEW.builds_reset_at := NOW() + INTERVAL '30 days';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_plan_limits ON public.profiles;
CREATE TRIGGER trg_set_plan_limits
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_plan_limits();

-- 5. RLS: Allow authenticated users to update their own builds_used / video_used / plan
-- (SELECT policy likely already exists — add UPDATE if not)

DROP POLICY IF EXISTS "Users can update own subscription fields" ON public.profiles;
CREATE POLICY "Users can update own subscription fields"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 6. Helper view: credit_status (safe to expose via anon key)
CREATE OR REPLACE VIEW public.credit_status AS
SELECT
  id,
  plan,
  builds_used,
  builds_limit,
  video_used,
  video_limit,
  builds_reset_at,
  CASE
    WHEN builds_limit = -1 THEN TRUE
    ELSE builds_used < builds_limit
  END AS can_build,
  CASE
    WHEN video_limit = -1 THEN TRUE
    ELSE video_used < video_limit
  END AS can_generate_video
FROM public.profiles;

-- RLS on view
ALTER VIEW public.credit_status OWNER TO postgres;

GRANT SELECT ON public.credit_status TO authenticated;

-- 7. RPC: safe increment of builds_used (called from server)
CREATE OR REPLACE FUNCTION public.increment_builds_used(user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.profiles
  SET builds_used = builds_used + 1
  WHERE id = user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_builds_used(UUID) TO authenticated;

-- 8. Backfill existing rows with correct limits
UPDATE public.profiles SET
  builds_limit = CASE plan
    WHEN 'starter' THEN 10
    WHEN 'growth'  THEN 50
    WHEN 'pro'     THEN -1
    ELSE 3
  END,
  video_limit = CASE plan
    WHEN 'growth' THEN 5
    WHEN 'pro'    THEN 25
    ELSE 0
  END
WHERE plan IS NOT NULL;
