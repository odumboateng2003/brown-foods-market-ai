
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS customer_code text UNIQUE;

CREATE INDEX IF NOT EXISTS profiles_customer_code_idx ON public.profiles (customer_code);
CREATE INDEX IF NOT EXISTS profiles_phone_idx ON public.profiles (phone);

CREATE OR REPLACE FUNCTION public.generate_customer_code(_full_name text, _created_at timestamptz)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  initials text;
  date_part text;
  seq int;
  candidate text;
BEGIN
  initials := upper(regexp_replace(
    coalesce(
      array_to_string(
        ARRAY(
          SELECT substr(w, 1, 1)
          FROM regexp_split_to_table(trim(coalesce(_full_name, '')), '[\s\-_.]+') AS w
          WHERE length(w) > 0
        ),
        ''
      ),
      ''
    ),
    '[^A-Z]', '', 'g'
  ));
  IF coalesce(initials, '') = '' THEN
    initials := 'CU';
  END IF;
  date_part := to_char(coalesce(_created_at, now()), 'DDMMYYYY');

  SELECT coalesce(max(
    nullif(regexp_replace(split_part(customer_code, '-', 3), '[^0-9]', '', 'g'), '')::int
  ), 0) + 1
  INTO seq
  FROM public.profiles
  WHERE customer_code LIKE initials || '-' || date_part || '-%';

  LOOP
    candidate := initials || '-' || date_part || '-' || lpad(seq::text, 3, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE customer_code = candidate);
    seq := seq + 1;
  END LOOP;

  RETURN candidate;
END;
$$;

-- Update the new-user handler to capture phone and assign a customer code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _full_name text;
  _phone text;
  _code text;
BEGIN
  _full_name := coalesce(new.raw_user_meta_data->>'full_name', new.email);
  _phone := nullif(new.raw_user_meta_data->>'phone', '');
  _code := public.generate_customer_code(_full_name, new.created_at);

  INSERT INTO public.profiles (id, full_name, phone, customer_code)
  VALUES (new.id, _full_name, _phone, _code)
  ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        phone = COALESCE(public.profiles.phone, EXCLUDED.phone),
        customer_code = COALESCE(public.profiles.customer_code, EXCLUDED.customer_code);
  RETURN new;
END;
$$;

-- Backfill existing profiles
DO $$
DECLARE
  r record;
  _code text;
  _phone text;
BEGIN
  FOR r IN
    SELECT p.id, p.full_name, p.created_at, u.raw_user_meta_data, u.phone AS auth_phone
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE p.customer_code IS NULL OR p.phone IS NULL
    ORDER BY p.created_at
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = r.id AND customer_code IS NOT NULL) THEN
      _code := public.generate_customer_code(r.full_name, r.created_at);
      UPDATE public.profiles SET customer_code = _code WHERE id = r.id;
    END IF;
    _phone := coalesce(nullif(r.raw_user_meta_data->>'phone', ''), nullif(r.auth_phone, ''));
    IF _phone IS NOT NULL THEN
      UPDATE public.profiles SET phone = _phone WHERE id = r.id AND phone IS NULL;
    END IF;
  END LOOP;
END $$;
