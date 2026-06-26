-- ============================================================
--  Migration 002 — Prompt draft autosave
--  Adds draft_prompt to profiles so in-progress prompts survive
--  page refreshes and dropped connections.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS draft_prompt TEXT;

-- ============================================================
--  DONE.
-- ============================================================
