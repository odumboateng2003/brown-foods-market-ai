
-- Restrict listing of objects in public buckets to admins/staff only.
-- Public direct-URL access remains available via bucket's public flag.
DROP POLICY IF EXISTS "Admins can list site-media objects" ON storage.objects;
CREATE POLICY "Admins can list site-media objects"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'site-media'
  AND (public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'staff'::public.app_role))
);

DROP POLICY IF EXISTS "Admins can list product-images objects" ON storage.objects;
CREATE POLICY "Admins can list product-images objects"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'staff'::public.app_role))
);
