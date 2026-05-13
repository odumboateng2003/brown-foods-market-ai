CREATE POLICY "Admins view webhook events" ON public.payment_webhook_events
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));