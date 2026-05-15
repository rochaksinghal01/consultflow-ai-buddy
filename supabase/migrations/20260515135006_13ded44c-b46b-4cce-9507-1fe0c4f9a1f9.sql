
CREATE TABLE public.engagements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT,
  project_name TEXT,
  deck_type TEXT,
  industry TEXT,
  company_size TEXT,
  challenge TEXT,
  objectives TEXT,
  timeline TEXT,
  budget TEXT,
  status TEXT DEFAULT 'discovery',
  current_step INT DEFAULT 1,
  research_summary TEXT,
  storyline_summary TEXT,
  qa_feedback TEXT,
  delivery_url TEXT,
  presentation_id TEXT,
  slack_thread_ts TEXT,
  contact_name TEXT,
  contact_email TEXT,
  additional_context TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.engagements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON public.engagements FOR SELECT USING (true);
CREATE POLICY "Public insert" ON public.engagements FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update" ON public.engagements FOR UPDATE USING (true);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER engagements_updated_at
BEFORE UPDATE ON public.engagements
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.engagements;
ALTER TABLE public.engagements REPLICA IDENTITY FULL;
