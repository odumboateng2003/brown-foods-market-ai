
DROP POLICY IF EXISTS "Users update own pending orders" ON public.orders;

CREATE POLICY "Admins update orders"
ON public.orders FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role));

CREATE POLICY "Users update own pending orders"
ON public.orders FOR UPDATE
USING (
  auth.uid() = user_id
  AND status = 'pending'
  AND coalesce(payment_status, 'pending') IN ('pending','failed')
)
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
  AND coalesce(payment_status, 'pending') IN ('pending','failed')
);
