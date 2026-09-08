-- Restore authenticated execution only for admin RPC endpoints confirmed to be used by the current admin UI.
-- Each function performs its own admin authorization check; this does not bypass RLS/business authorization.
GRANT EXECUTE ON FUNCTION public.admin_available_sales_cards() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_sales_with_cards(text, text, text, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_admin_data() TO authenticated;
