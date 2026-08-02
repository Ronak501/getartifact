-- ============================================================
--  Migration 003 — Artifact history
-- ============================================================

CREATE TABLE IF NOT EXISTS public.artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  prompt TEXT,
  output JSONB NOT NULL,
  model_used VARCHAR(255),
  is_favorited BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_artifacts_user_id
  ON public.artifacts(user_id);

CREATE INDEX IF NOT EXISTS idx_artifacts_created_at
  ON public.artifacts(created_at DESC);

ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own artifacts" ON public.artifacts;
CREATE POLICY "Users can manage their own artifacts"
ON public.artifacts
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================================
--  DONE.
-- ============================================================
