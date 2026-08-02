-- ============================================================
--  AI 3D Website Builder — Supabase Database Schema
--  Run this entire file in Supabase SQL Editor to create all tables.
-- ============================================================

-- ── Extensions ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 1. Profiles ───────────────────────────────────────────────────────────────
-- Mirrors auth.users; created automatically via trigger on signup.
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username        TEXT        UNIQUE,
  display_name    TEXT,
  avatar_url      TEXT,
  plan            TEXT        NOT NULL DEFAULT 'free'
                              CHECK (plan IN ('free', 'pro', 'enterprise')),
  generations_used INT        NOT NULL DEFAULT 0,
  generations_limit INT       NOT NULL DEFAULT 10,   -- free tier limit
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 2. Blueprints ─────────────────────────────────────────────────────────────
-- Stores every AI-generated build (architecture + website JSON + Veo data + code).
CREATE TABLE IF NOT EXISTS public.blueprints (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Prompt & metadata
  name                    TEXT        NOT NULL DEFAULT 'Untitled',
  prompt                  TEXT        NOT NULL,
  design_style            TEXT,
  color_primary           TEXT,
  color_secondary         TEXT,
  color_accent            TEXT,

  -- Generated data (stored as JSONB for querying)
  blueprint_json          JSONB,      -- architecture blueprint
  website_blueprint_json  JSONB,      -- render-ready website JSON
  veo_data_json           JSONB,      -- Veo prompt + metadata
  generated_code_json     JSONB,      -- React + Three.js code strings

  -- Social / management
  is_public               BOOLEAN     NOT NULL DEFAULT FALSE,
  is_favorite             BOOLEAN     NOT NULL DEFAULT FALSE,
  view_count              INT         NOT NULL DEFAULT 0,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.blueprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own blueprints"
  ON public.blueprints FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public blueprints are readable by anyone"
  ON public.blueprints FOR SELECT USING (is_public = TRUE);

-- Index for fast user queries
CREATE INDEX IF NOT EXISTS blueprints_user_id_idx ON public.blueprints (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS blueprints_public_idx   ON public.blueprints (is_public, created_at DESC) WHERE is_public = TRUE;

-- ── 3. Artifacts ───────────────────────────────────────────────────────────────
-- Stores generated artifacts for history/reuse management.
CREATE TABLE IF NOT EXISTS public.artifacts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  prompt          TEXT,
  output          JSONB       NOT NULL,
  model_used      VARCHAR(255),
  is_favorited    BOOLEAN     NOT NULL DEFAULT FALSE,
  metadata        JSONB
);

ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own artifacts"
  ON public.artifacts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_artifacts_user_id    ON public.artifacts (user_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_created_at ON public.artifacts (created_at DESC);

-- ── 4. Veo Jobs ───────────────────────────────────────────────────────────────
-- Tracks individual Veo 2 video generation requests.
CREATE TABLE IF NOT EXISTS public.veo_jobs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blueprint_id    UUID        REFERENCES public.blueprints(id) ON DELETE SET NULL,

  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'processing', 'complete', 'error')),
  veo_prompt      TEXT,
  video_gcs_uri   TEXT,       -- gs://... URI from Veo
  video_proxy_url TEXT,       -- /api/video-proxy?uri=... for browser
  duration_secs   INT,
  resolution      TEXT        DEFAULT '1280x720',
  error_message   TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

ALTER TABLE public.veo_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own veo jobs"
  ON public.veo_jobs FOR ALL USING (auth.uid() = user_id);

-- ── 5. Shared / Exports ───────────────────────────────────────────────────────
-- Public share links for blueprints.
CREATE TABLE IF NOT EXISTS public.shared_blueprints (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id    UUID        NOT NULL REFERENCES public.blueprints(id) ON DELETE CASCADE,
  share_token     TEXT        UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  expires_at      TIMESTAMPTZ,        -- NULL = never expires
  view_count      INT         NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.shared_blueprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read shared blueprints by token"
  ON public.shared_blueprints FOR SELECT USING (TRUE);

CREATE POLICY "Blueprint owner can manage shares"
  ON public.shared_blueprints FOR ALL
  USING (
    blueprint_id IN (
      SELECT id FROM public.blueprints WHERE user_id = auth.uid()
    )
  );

-- ── 6. Helper: updated_at trigger ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_blueprints_updated_at
  BEFORE UPDATE ON public.blueprints
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 7. Helper view: blueprint_summary ─────────────────────────────────────────
-- Lightweight view (no heavy JSONB) for listing cards in the Dashboard.
CREATE OR REPLACE VIEW public.blueprint_summary AS
SELECT
  b.id,
  b.user_id,
  b.name,
  b.prompt,
  b.design_style,
  b.color_primary,
  b.color_secondary,
  b.color_accent,
  b.is_public,
  b.is_favorite,
  b.view_count,
  b.created_at,
  b.updated_at,
  -- Pull a couple of fields from JSONB for display without sending the full blob
  b.website_blueprint_json->>'website_name'  AS website_name,
  b.website_blueprint_json->>'business_type' AS business_type,
  b.veo_data_json IS NOT NULL                AS has_veo,
  b.website_blueprint_json IS NOT NULL       AS has_preview
FROM public.blueprints b;

-- ============================================================
--  DONE. Tables: profiles, blueprints, veo_jobs, shared_blueprints
-- ============================================================
