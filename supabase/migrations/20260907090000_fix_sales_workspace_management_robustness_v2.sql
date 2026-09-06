-- ALJAVA TERIONITY — Harden Sales Workspace management
-- Keeps legacy/unscoped cards available to the admin while preserving dashboard visibility.
-- Hardens assignment/create-with-cards against stale or duplicated selections.

DROP FUNCTION IF EXISTS public.admin_create_sales_with_cards(text,text,text,uuid[]);

CREATE OR REPLACE FUNCTION public.admin_available_sales_cards()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,auth
AS $$
DECLARE v_business_unit_id uuid; v_cards jsonb;
BEGIN
  IF NOT public.is_admin_user() THEN RAISE EXCEPTION 'unauthorized'; END IF;
  SELECT bm.business_unit_id INTO v_business_unit_id
    FROM public.business_memberships bm
   WHERE bm.user_id=auth.uid() AND bm.status='active' AND bm.role IN ('owner','admin')
   ORDER BY CASE bm.role WHEN 'owner' THEN 0 ELSE 1 END, bm.created_at LIMIT 1;
  IF v_business_unit_id IS NULL THEN RAISE EXCEPTION 'admin_business_unit_required'; END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id',c.id,'card_code',c.card_code,'status',c.status,'product_type',c.product_type,
    'product_id',c.product_id,'product_name',p.name,'created_at',c.created_at
  ) ORDER BY c.created_at DESC),'[]'::jsonb)
    INTO v_cards
    FROM public."Cards" c
    LEFT JOIN public."Product" p ON p.id=c.product_id
   WHERE (c.business_unit_id IS NULL OR c.business_unit_id=v_business_unit_id)
     AND lower(COALESCE(c.status,''))='pending'
     AND NOT EXISTS (
       SELECT 1 FROM public.sales_code_assignments a
        WHERE a.card_id=c.id AND a.status='active'
     );
  RETURN v_cards;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_assign_sales_card_by_code(p_sales_id uuid,p_card_code text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth
AS $$
DECLARE v_card public."Cards"%rowtype; v_assignment uuid; v_sales_bu uuid; v_code text:=upper(btrim(p_card_code));
BEGIN
  IF NOT public.is_admin_user() THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF v_code IS NULL OR v_code='' THEN RAISE EXCEPTION 'card_code_required'; END IF;
  SELECT business_unit_id INTO v_sales_bu FROM public."Sales" WHERE id=p_sales_id AND lower(status)='active';
  IF NOT FOUND THEN RAISE EXCEPTION 'sales_inactive'; END IF;
  SELECT c.* INTO v_card
    FROM public."Cards" c
   WHERE upper(c.card_code)=v_code
     AND (c.business_unit_id IS NULL OR c.business_unit_id=v_sales_bu)
     AND lower(COALESCE(c.status,''))='pending'
   ORDER BY c.created_at DESC LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'card_not_available'; END IF;
  IF EXISTS(SELECT 1 FROM public.sales_code_assignments WHERE card_id=v_card.id AND status='active') THEN
    RAISE EXCEPTION 'card_already_assigned';
  END IF;
  INSERT INTO public.sales_code_assignments(sales_id,card_id,business_unit_id,assigned_by)
  VALUES(p_sales_id,v_card.id,v_sales_bu,auth.uid()) RETURNING id INTO v_assignment;
  RETURN jsonb_build_object('id',v_assignment,'card_id',v_card.id,'card_code',v_card.card_code,'product_type',v_card.product_type,'status',v_card.status,'assigned_at',now());
END;
$$;

CREATE FUNCTION public.admin_create_sales_with_cards(
  p_name text,p_sales_code text,p_whatsapp text,p_card_ids uuid[] DEFAULT '{}'::uuid[]
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth
AS $$
DECLARE
  v_business_unit_id uuid; v_name text:=btrim(p_name); v_code text:=upper(btrim(p_sales_code));
  v_whatsapp text:=btrim(p_whatsapp); v_sales_id uuid; v_card_ids uuid[];
  v_card_count integer; v_available_count integer; v_cards jsonb;
BEGIN
  IF NOT public.is_admin_user() THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF v_name IS NULL OR v_name='' THEN RAISE EXCEPTION 'name_required'; END IF;
  IF v_code IS NULL OR v_code='' THEN RAISE EXCEPTION 'sales_code_required'; END IF;
  IF v_code !~ '^[A-Z0-9][A-Z0-9_-]{2,31}$' THEN RAISE EXCEPTION 'invalid_sales_code'; END IF;
  IF v_whatsapp IS NULL OR v_whatsapp='' THEN RAISE EXCEPTION 'whatsapp_required'; END IF;
  IF regexp_replace(v_whatsapp,'[^0-9]','','g') !~ '^[0-9]{8,15}$' THEN RAISE EXCEPTION 'invalid_whatsapp'; END IF;
  IF EXISTS(SELECT 1 FROM public."Sales" s WHERE lower(s.sales_code)=lower(v_code)) THEN RAISE EXCEPTION 'sales_code_exists'; END IF;

  SELECT bm.business_unit_id INTO v_business_unit_id FROM public.business_memberships bm
   WHERE bm.user_id=auth.uid() AND bm.status='active' AND bm.role IN ('owner','admin')
   ORDER BY CASE bm.role WHEN 'owner' THEN 0 ELSE 1 END,bm.created_at LIMIT 1;
  IF v_business_unit_id IS NULL THEN RAISE EXCEPTION 'admin_business_unit_required'; END IF;

  SELECT COALESCE(array_agg(DISTINCT x ORDER BY x),'{}'::uuid[]) INTO v_card_ids
    FROM unnest(COALESCE(p_card_ids,'{}'::uuid[])) x WHERE x IS NOT NULL;
  v_card_count:=cardinality(v_card_ids);

  SELECT count(*) INTO v_available_count FROM public."Cards" c
   WHERE v_card_count>0 AND c.id=ANY(v_card_ids)
     AND (c.business_unit_id IS NULL OR c.business_unit_id=v_business_unit_id)
     AND lower(COALESCE(c.status,''))='pending'
     AND NOT EXISTS(SELECT 1 FROM public.sales_code_assignments a WHERE a.card_id=c.id AND a.status='active');
  IF v_card_count<>COALESCE(v_available_count,0) THEN RAISE EXCEPTION 'card_not_available'; END IF;

  INSERT INTO public."Sales"(sales_code,name,whatsapp,status,business_unit_id,created_at)
  VALUES(v_code,v_name,v_whatsapp,'active',v_business_unit_id,now()) RETURNING id INTO v_sales_id;
  IF v_card_count>0 THEN
    INSERT INTO public.sales_code_assignments(sales_id,card_id,business_unit_id,assigned_by)
    SELECT v_sales_id,c.id,v_business_unit_id,auth.uid() FROM public."Cards" c WHERE c.id=ANY(v_card_ids);
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('id',c.id,'card_code',c.card_code,'product_type',c.product_type,'product_name',p.name,'status',c.status) ORDER BY c.card_code),'[]'::jsonb)
    INTO v_cards
    FROM public."Cards" c LEFT JOIN public."Product" p ON p.id=c.product_id WHERE c.id=ANY(v_card_ids);
  RETURN jsonb_build_object('id',v_sales_id,'sales_code',v_code,'name',v_name,'whatsapp',v_whatsapp,'status','active','created_at',now(),'cards',v_cards);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_dashboard_card_sales_attribution()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth
AS $$
DECLARE v_business_unit_id uuid; result jsonb;
BEGIN
  IF NOT public.is_admin_user() THEN RAISE EXCEPTION 'unauthorized'; END IF;
  SELECT bm.business_unit_id INTO v_business_unit_id FROM public.business_memberships bm
   WHERE bm.user_id=auth.uid() AND bm.status='active' AND bm.role IN ('owner','admin')
   ORDER BY CASE bm.role WHEN 'owner' THEN 0 ELSE 1 END,bm.created_at LIMIT 1;
  IF v_business_unit_id IS NULL THEN RAISE EXCEPTION 'admin_business_unit_required'; END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'card_id',c.id,'card_code',c.card_code,
    'held_by_sales_id',a.sales_id,'held_by_sales_name',hs.name,'held_at',a.assigned_at,
    'activated_by_sales_id',tx.sales_id,'activated_by_sales_name',asales.name,
    'activated_at',COALESCE(tx.transaction_date,c.activated_at)
  ) ORDER BY c.created_at DESC),'[]'::jsonb) INTO result
  FROM public."Cards" c
  LEFT JOIN LATERAL (SELECT a.sales_id,a.assigned_at FROM public.sales_code_assignments a WHERE a.card_id=c.id AND a.status='active' ORDER BY a.assigned_at DESC LIMIT 1) a ON true
  LEFT JOIN public."Sales" hs ON hs.id=a.sales_id
  LEFT JOIN LATERAL (SELECT t.sales_id,t.transaction_date FROM public."Transactions" t WHERE t.card_id=c.id AND t.sales_id IS NOT NULL ORDER BY t.transaction_date ASC LIMIT 1) tx ON true
  LEFT JOIN public."Sales" asales ON asales.id=tx.sales_id
  WHERE c.business_unit_id IS NULL OR c.business_unit_id=v_business_unit_id;
  RETURN result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_available_sales_cards() FROM public,anon;
GRANT EXECUTE ON FUNCTION public.admin_available_sales_cards() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_assign_sales_card_by_code(uuid,text) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.admin_assign_sales_card_by_code(uuid,text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_create_sales_with_cards(text,text,text,uuid[]) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.admin_create_sales_with_cards(text,text,text,uuid[]) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_dashboard_card_sales_attribution() FROM public,anon;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_card_sales_attribution() TO authenticated;
