ALTER TABLE public.engagements
  ADD COLUMN IF NOT EXISTS requirements_json JSONB,
  ADD COLUMN IF NOT EXISTS research_brief JSONB,
  ADD COLUMN IF NOT EXISTS storyline_json JSONB;