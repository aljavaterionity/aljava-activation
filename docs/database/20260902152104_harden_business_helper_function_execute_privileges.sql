-- Harden internal business helper RPC execute privileges.
-- No table data is changed by this migration.
-- Keep these helpers callable by authenticated application users and backend roles,
-- while removing direct anonymous/public EXECUTE access.

revoke execute on function public.get_my_business_units() from public, anon;
grant execute on function public.get_my_business_units() to authenticated;

revoke execute on function public.has_business_permission(uuid, text) from public, anon;
grant execute on function public.has_business_permission(uuid, text) to authenticated;

revoke execute on function public.is_business_member(uuid) from public, anon;
grant execute on function public.is_business_member(uuid) to authenticated;

revoke execute on function public.set_card_scan_business_unit() from public, anon;
grant execute on function public.set_card_scan_business_unit() to authenticated;
