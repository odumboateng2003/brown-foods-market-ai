
-- Staff profiles: tracks status + metadata for admin/staff users
CREATE TABLE IF NOT EXISTS public.staff_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','disabled')),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_profiles TO authenticated;
GRANT ALL ON public.staff_profiles TO service_role;

ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage staff profiles"
  ON public.staff_profiles
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff view own profile"
  ON public.staff_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE TRIGGER staff_profiles_touch
  BEFORE UPDATE ON public.staff_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Staff activity log
CREATE TABLE IF NOT EXISTS public.staff_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID,
  actor_email TEXT,
  target_user_id UUID,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.staff_activity_logs TO authenticated;
GRANT ALL ON public.staff_activity_logs TO service_role;

ALTER TABLE public.staff_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins view all activity"
  ON public.staff_activity_logs
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff view own activity"
  ON public.staff_activity_logs
  FOR SELECT
  USING (auth.uid() = actor_id);

CREATE POLICY "Authenticated can insert own activity"
  ON public.staff_activity_logs
  FOR INSERT
  WITH CHECK (auth.uid() = actor_id OR public.has_role(auth.uid(), 'admin'));

-- Role helper functions
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::app_role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'staff'::app_role)
     OR public.has_role(_user_id, 'admin'::app_role);
$$;

-- Backfill staff_profiles for existing admin/staff users
INSERT INTO public.staff_profiles (user_id, email, full_name, status)
SELECT DISTINCT u.id,
       u.email,
       COALESCE(p.full_name, u.email),
       'active'
FROM auth.users u
JOIN public.user_roles r ON r.user_id = u.id
LEFT JOIN public.profiles p ON p.id = u.id
WHERE r.role IN ('admin','staff')
ON CONFLICT (user_id) DO NOTHING;
