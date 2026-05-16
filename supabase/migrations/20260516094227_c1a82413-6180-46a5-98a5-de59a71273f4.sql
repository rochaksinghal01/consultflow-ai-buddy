ALTER TABLE public.engagements
ADD COLUMN IF NOT EXISTS revision_notes text,
ADD COLUMN IF NOT EXISTS revision_gate integer;