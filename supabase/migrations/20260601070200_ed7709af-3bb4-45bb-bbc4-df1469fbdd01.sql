
-- Product schema additions
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS cost_price_ghs numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sale_price_ghs numeric,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Product images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Product images public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Admins upload product images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins update product images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images' AND public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins delete product images"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images' AND public.has_role(auth.uid(),'admin'));

-- Finance settings (single row)
CREATE TABLE public.finance_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reinvestment_percent numeric NOT NULL DEFAULT 20,
  operational_expense_percent numeric NOT NULL DEFAULT 10,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_settings TO authenticated;
GRANT ALL ON public.finance_settings TO service_role;

ALTER TABLE public.finance_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage finance settings"
ON public.finance_settings FOR ALL
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.finance_settings (reinvestment_percent, operational_expense_percent)
VALUES (20, 10);

-- Finance transactions
CREATE TYPE public.finance_txn_type AS ENUM ('revenue','expense','reinvestment','withdrawal','investment');

CREATE TABLE public.finance_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.finance_txn_type NOT NULL,
  amount_ghs numeric NOT NULL,
  note text,
  order_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_transactions TO authenticated;
GRANT ALL ON public.finance_transactions TO service_role;

ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage finance transactions"
ON public.finance_transactions FOR ALL
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE INDEX idx_finance_transactions_type_created ON public.finance_transactions(type, created_at DESC);
