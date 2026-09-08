-- Restore authenticated execution for the protected dashboard card-attribution RPC.
-- The function is SECURITY DEFINER and performs its own is_admin_user() check.
-- It is a dashboard API endpoint, not an internal-only helper.

grant execute on function public.admin_dashboard_card_sales_attribution() to authenticated;
