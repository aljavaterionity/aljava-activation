-- ALJAVA audit hardening
-- Purpose: remove proven duplicate index and restrict direct API execution of
-- privileged SECURITY DEFINER functions. No RLS is disabled.

DROP INDEX IF EXISTS public.sales_code_assignments_one_active_card_idx;

REVOKE EXECUTE ON FUNCTION public.get_admin_business_units() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_assign_sales_card(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_assign_sales_card_by_code(uuid, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_available_sales_cards() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_create_sales(text, text, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_create_sales_with_cards(text, text, text, uuid[]) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_dashboard_card_sales_attribution() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_reset_dashboard() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_sales_detail(uuid, timestamptz, timestamptz) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_sales_workspace(timestamptz, timestamptz) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_set_sales_status(uuid, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_unassign_sales_card(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.create_default_task_for_project(uuid, text, uuid, date) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.create_project_from_won_pipeline(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_marketplace_catalog() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_my_business_units() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_platform_overview(timestamptz, timestamptz) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.has_business_permission(uuid, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_business_member(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.reset_admin_data() FROM authenticated;
