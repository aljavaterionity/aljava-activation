-- Production hotfix: Supabase/Postgres requires an explicit WHERE clause
-- for these full-table DELETE operations. WHERE TRUE preserves the intended
-- full reset while satisfying the database guard.
CREATE OR REPLACE FUNCTION public.admin_reset_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_card_scans bigint := 0;
  deleted_admin_actions bigint := 0;
  deleted_assignments bigint := 0;
  deleted_payment_audit bigint := 0;
  deleted_finance bigint := 0;
  deleted_transactions bigint := 0;
  deleted_subscriptions bigint := 0;
  deleted_cards bigint := 0;
  deleted_legacy_cards bigint := 0;
  deleted_customers bigint := 0;
  deleted_sales bigint := 0;
BEGIN
  IF NOT public.is_admin_user() THEN RAISE EXCEPTION 'Admin access required'; END IF;
  DELETE FROM public."CardScans" WHERE TRUE; GET DIAGNOSTICS deleted_card_scans = ROW_COUNT;
  DELETE FROM public.admin_card_actions WHERE TRUE; GET DIAGNOSTICS deleted_admin_actions = ROW_COUNT;
  DELETE FROM public.sales_code_assignments WHERE TRUE; GET DIAGNOSTICS deleted_assignments = ROW_COUNT;
  DELETE FROM public.transaction_payment_audit WHERE TRUE; GET DIAGNOSTICS deleted_payment_audit = ROW_COUNT;
  DELETE FROM public.finance_entries WHERE transaction_id IS NOT NULL; GET DIAGNOSTICS deleted_finance = ROW_COUNT;
  DELETE FROM public."Transactions" WHERE TRUE; GET DIAGNOSTICS deleted_transactions = ROW_COUNT;
  DELETE FROM public."Subscriptions" WHERE TRUE; GET DIAGNOSTICS deleted_subscriptions = ROW_COUNT;
  DELETE FROM public."Cards" WHERE TRUE; GET DIAGNOSTICS deleted_cards = ROW_COUNT;
  DELETE FROM public.cards WHERE TRUE; GET DIAGNOSTICS deleted_legacy_cards = ROW_COUNT;
  DELETE FROM public."Customers" WHERE TRUE; GET DIAGNOSTICS deleted_customers = ROW_COUNT;
  DELETE FROM public."Sales" WHERE TRUE; GET DIAGNOSTICS deleted_sales = ROW_COUNT;
  RETURN jsonb_build_object('success', true, 'deleted', jsonb_build_object(
    'CardScans', deleted_card_scans,
    'admin_card_actions', deleted_admin_actions,
    'sales_code_assignments', deleted_assignments,
    'transaction_payment_audit', deleted_payment_audit,
    'finance_entries', deleted_finance,
    'Transactions', deleted_transactions,
    'Subscriptions', deleted_subscriptions,
    'Cards', deleted_cards,
    'legacy_cards', deleted_legacy_cards,
    'Customers', deleted_customers,
    'Sales', deleted_sales
  ), 'product_preserved', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reset_dashboard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reset_dashboard() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_dashboard() TO service_role;

CREATE OR REPLACE FUNCTION public.reset_admin_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_user() THEN RAISE EXCEPTION 'Admin access required'; END IF;
  RETURN public.admin_reset_dashboard();
END;
$$;

REVOKE ALL ON FUNCTION public.reset_admin_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_admin_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_admin_data() TO service_role;
