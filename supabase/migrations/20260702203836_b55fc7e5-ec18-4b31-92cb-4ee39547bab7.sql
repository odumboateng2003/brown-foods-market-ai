
-- Categories: image + description
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS description text;

-- Cart items: updated_at for abandoned detection
ALTER TABLE public.cart_items ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS trg_cart_items_touch_updated_at ON public.cart_items;
CREATE TRIGGER trg_cart_items_touch_updated_at
BEFORE UPDATE ON public.cart_items
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Admin/staff read access to all cart_items (for Cart Management dashboard)
DROP POLICY IF EXISTS "admin_staff_read_all_carts" ON public.cart_items;
CREATE POLICY "admin_staff_read_all_carts"
  ON public.cart_items FOR SELECT
  TO authenticated
  USING (public.is_admin_staff(auth.uid()));

-- Admin/staff manage categories (image_url column etc.) — ensure they can update
DROP POLICY IF EXISTS "admin_staff_manage_categories" ON public.categories;
CREATE POLICY "admin_staff_manage_categories"
  ON public.categories FOR ALL
  TO authenticated
  USING (public.is_admin_staff(auth.uid()))
  WITH CHECK (public.is_admin_staff(auth.uid()));
