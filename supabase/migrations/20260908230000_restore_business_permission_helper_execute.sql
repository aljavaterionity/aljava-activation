-- Restore EXECUTE for the RLS helper used by authenticated requests.
-- The helper is SECURITY DEFINER and is intentionally callable by authenticated
-- sessions so RLS policies can evaluate business permissions safely.
-- No RLS policy is disabled and no data is changed.
GRANT EXECUTE ON FUNCTION public.has_business_permission(uuid, text) TO authenticated;
