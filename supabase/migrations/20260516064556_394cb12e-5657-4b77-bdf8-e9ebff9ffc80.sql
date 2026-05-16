
-- site_content: key/value editable content with draft + published JSONB
CREATE TABLE public.site_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  draft_content jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_content jsonb,
  published_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published content"
  ON public.site_content FOR SELECT
  USING (published_content IS NOT NULL);

CREATE POLICY "Admins manage site content"
  ON public.site_content FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_site_content_touch
  BEFORE UPDATE ON public.site_content
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- site_faqs
CREATE TABLE public.site_faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published FAQs"
  ON public.site_faqs FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admins manage FAQs"
  ON public.site_faqs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_site_faqs_touch
  BEFORE UPDATE ON public.site_faqs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed default content keys with empty drafts
INSERT INTO public.site_content (key, draft_content) VALUES
  ('home_hero', '{}'::jsonb),
  ('about', '{}'::jsonb),
  ('contact', '{}'::jsonb),
  ('privacy', '{}'::jsonb),
  ('terms', '{}'::jsonb),
  ('footer', '{}'::jsonb),
  ('business_info', '{}'::jsonb),
  ('delivery_info', '{}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Storage bucket for site media
INSERT INTO storage.buckets (id, name, public)
  VALUES ('site-media', 'site-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view site media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'site-media');

CREATE POLICY "Admins upload site media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'site-media' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update site media"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'site-media' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete site media"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'site-media' AND public.has_role(auth.uid(), 'admin'));
