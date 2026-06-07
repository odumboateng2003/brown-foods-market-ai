
-- 1. Restrict staff_activity_logs INSERT to admin/staff only
DROP POLICY IF EXISTS "Authenticated can insert own activity" ON public.staff_activity_logs;
CREATE POLICY "Admin & staff insert activity" ON public.staff_activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    (auth.uid() = actor_id)
    AND (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'staff'::public.app_role))
  );

-- 2. Lock down EXECUTE on admin-only SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.get_admin_products() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_site_content(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_products() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_site_content(text) TO authenticated, service_role;

-- 3. Re-assert that cost_price_ghs is NOT selectable by anon/authenticated.
-- Revoke any column-level SELECT then re-grant only the safe columns.
REVOKE SELECT ON public.products FROM anon, authenticated;
GRANT SELECT (
  id, category_id, name, slug, description, price_ghs, sale_price_ghs,
  image_url, unit, stock, is_active, is_featured, created_at
) ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;
