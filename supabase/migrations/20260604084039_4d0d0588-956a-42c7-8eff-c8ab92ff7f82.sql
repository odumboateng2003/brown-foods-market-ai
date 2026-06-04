
ALTER FUNCTION public.has_role(uuid, public.app_role) SECURITY DEFINER;

REVOKE SELECT ON public.products FROM anon, authenticated;
GRANT SELECT (
  id, name, slug, description, price_ghs, sale_price_ghs, image_url, unit,
  stock, is_active, is_featured, category_id, created_at
) ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

CREATE OR REPLACE FUNCTION public.get_admin_products()
RETURNS SETOF public.products
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role)
     AND NOT public.has_role(auth.uid(), 'staff'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY SELECT * FROM public.products ORDER BY name;
END;
$$;
REVOKE ALL ON FUNCTION public.get_admin_products() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_products() TO authenticated;

REVOKE SELECT ON public.site_content FROM anon, authenticated;
GRANT SELECT (id, key, published_content, published_at, updated_at)
  ON public.site_content TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_content TO authenticated;
GRANT ALL ON public.site_content TO service_role;

CREATE OR REPLACE FUNCTION public.get_admin_site_content(_key text)
RETURNS TABLE (
  draft_content jsonb,
  published_content jsonb,
  published_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
    SELECT sc.draft_content, sc.published_content, sc.published_at, sc.updated_at
    FROM public.site_content sc
    WHERE sc.key = _key;
END;
$$;
REVOKE ALL ON FUNCTION public.get_admin_site_content(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_site_content(text) TO authenticated;

DROP POLICY IF EXISTS "Public can view site media" ON storage.objects;
DROP POLICY IF EXISTS "Product images public read" ON storage.objects;
