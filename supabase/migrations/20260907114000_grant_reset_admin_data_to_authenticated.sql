-- Allow the authenticated admin dashboard to invoke the privileged reset wrapper.
-- The wrapper itself delegates to admin_reset_dashboard, which verifies admin access.
grant execute on function public.reset_admin_data() to authenticated;
revoke execute on function public.reset_admin_data() from anon;
