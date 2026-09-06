-- Align legacy cards (business_unit_id IS NULL) with admin Sales Workspace flows.
-- Also harden dashboard card attribution and preserve existing card visibility.

create or replace function public.admin_available_sales_cards()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_business_unit_id uuid; v_cards jsonb;
begin
  if not public.is_admin_user() then raise exception 'unauthorized'; end if;
  select bm.business_unit_id into v_business_unit_id from public.business_memberships bm
  where bm.user_id=auth.uid() and bm.status='active' and bm.role in ('owner','admin')
  order by case bm.role when 'owner' then 0 else 1 end,bm.created_at limit 1;
  if v_business_unit_id is null then raise exception 'admin_business_unit_required'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'card_code',c.card_code,'status',c.status,'product_type',c.product_type,'product_id',c.product_id,'product_name',p.name,'created_at',c.created_at) order by c.created_at desc),'[]'::jsonb)
  into v_cards from public."Cards" c left join public."Product" p on p.id=c.product_id
  where (c.business_unit_id is null or c.business_unit_id=v_business_unit_id)
    and lower(coalesce(c.status,''))='pending'
    and not exists(select 1 from public.sales_code_assignments a where a.card_id=c.id and a.status='active');
  return v_cards;
end;
$$;

create or replace function public.admin_assign_sales_card_by_code(p_sales_id uuid,p_card_code text)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare v_card public."Cards"%rowtype; v_assignment uuid; v_sales_bu uuid;
begin
  if not public.is_admin_user() then raise exception 'unauthorized'; end if;
  select business_unit_id into v_sales_bu from public."Sales" where id=p_sales_id and lower(status)='active';
  if not found then raise exception 'sales_inactive'; end if;
  select * into v_card from public."Cards" where lower(card_code)=lower(trim(p_card_code))
    and (business_unit_id is null or business_unit_id=v_sales_bu) limit 1;
  if not found then raise exception 'card_not_found'; end if;
  if lower(coalesce(v_card.status,''))<>'pending' then raise exception 'card_not_available'; end if;
  if exists(select 1 from public.sales_code_assignments where card_id=v_card.id and status='active') then raise exception 'card_already_assigned'; end if;
  insert into public.sales_code_assignments(sales_id,card_id,business_unit_id,assigned_by)
  values(p_sales_id,v_card.id,v_sales_bu,auth.uid()) returning id into v_assignment;
  return jsonb_build_object('id',v_assignment,'card_id',v_card.id,'card_code',v_card.card_code,'product_type',v_card.product_type,'status',v_card.status,'assigned_at',now());
end;
$$;

drop function if exists public.admin_create_sales_with_cards(text,text,text,uuid[]);
create function public.admin_create_sales_with_cards(p_name text,p_sales_code text,p_whatsapp text,p_card_ids uuid[] default '{}'::uuid[])
returns jsonb language plpgsql security definer set search_path=public
as $$
declare v_business_unit_id uuid; v_name text:=btrim(p_name); v_code text:=upper(btrim(p_sales_code)); v_whatsapp text:=btrim(p_whatsapp); v_sales_id uuid; v_card_count integer:=coalesce(cardinality(p_card_ids),0); v_available_count integer; v_cards jsonb;
begin
  if not public.is_admin_user() then raise exception 'unauthorized'; end if;
  if v_name is null or v_name='' then raise exception 'name_required'; end if;
  if v_code is null or v_code='' then raise exception 'sales_code_required'; end if;
  if v_code !~ '^[A-Z0-9][A-Z0-9_-]{2,31}$' then raise exception 'invalid_sales_code'; end if;
  if v_whatsapp is null or v_whatsapp='' then raise exception 'whatsapp_required'; end if;
  if regexp_replace(v_whatsapp,'[^0-9]','','g') !~ '^[0-9]{8,15}$' then raise exception 'invalid_whatsapp'; end if;
  if exists(select 1 from public."Sales" s where lower(s.sales_code)=lower(v_code)) then raise exception 'sales_code_exists'; end if;
  select bm.business_unit_id into v_business_unit_id from public.business_memberships bm
  where bm.user_id=auth.uid() and bm.status='active' and bm.role in ('owner','admin')
  order by case bm.role when 'owner' then 0 else 1 end,bm.created_at limit 1;
  if v_business_unit_id is null then raise exception 'admin_business_unit_required'; end if;
  if v_card_count>0 then
    select count(*) into v_available_count from public."Cards" c
    where c.id=any(p_card_ids) and (c.business_unit_id is null or c.business_unit_id=v_business_unit_id)
      and lower(coalesce(c.status,''))='pending'
      and not exists(select 1 from public.sales_code_assignments a where a.card_id=c.id and a.status='active');
    if v_card_count <> coalesce(v_available_count,0) then raise exception 'card_not_available'; end if;
  end if;
  insert into public."Sales"(sales_code,name,whatsapp,status,business_unit_id,created_at)
  values(v_code,v_name,v_whatsapp,'active',v_business_unit_id,now()) returning id into v_sales_id;
  if v_card_count>0 then
    insert into public.sales_code_assignments(sales_id,card_id,business_unit_id,assigned_by)
    select v_sales_id,c.id,v_business_unit_id,auth.uid() from public."Cards" c
    where c.id=any(p_card_ids) and (c.business_unit_id is null or c.business_unit_id=v_business_unit_id) and lower(coalesce(c.status,''))='pending';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'card_code',c.card_code,'product_type',c.product_type,'product_name',p.name,'status',c.status) order by c.card_code),'[]'::jsonb)
  into v_cards from public."Cards" c left join public."Product" p on p.id=c.product_id where c.id=any(p_card_ids);
  return jsonb_build_object('id',v_sales_id,'sales_code',v_code,'name',v_name,'whatsapp',v_whatsapp,'status','active','created_at',now(),'cards',v_cards);
end;
$$;

create or replace function public.admin_dashboard_card_sales_attribution()
returns jsonb language plpgsql security definer set search_path=public
as $$
declare v_business_unit_id uuid; result jsonb;
begin
  if not public.is_admin_user() then raise exception 'unauthorized'; end if;
  select bm.business_unit_id into v_business_unit_id from public.business_memberships bm
  where bm.user_id=auth.uid() and bm.status='active' and bm.role in ('owner','admin')
  order by case bm.role when 'owner' then 0 else 1 end,bm.created_at limit 1;
  if v_business_unit_id is null then raise exception 'admin_business_unit_required'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('card_id',c.id,'card_code',c.card_code,'held_by_sales_id',a.sales_id,'held_by_sales_name',hs.name,'held_at',a.assigned_at,'activated_by_sales_id',tx.sales_id,'activated_by_sales_name',asales.name,'activated_at',coalesce(tx.transaction_date,c.activated_at)) order by c.created_at desc),'[]'::jsonb)
  into result from public."Cards" c
  left join lateral (select a.sales_id,a.assigned_at from public.sales_code_assignments a where a.card_id=c.id and a.status='active' order by a.assigned_at desc limit 1) a on true
  left join public."Sales" hs on hs.id=a.sales_id
  left join lateral (select t.sales_id,t.transaction_date from public."Transactions" t where t.card_id=c.id and t.sales_id is not null order by t.transaction_date asc limit 1) tx on true
  left join public."Sales" asales on asales.id=tx.sales_id
  where c.business_unit_id is null or c.business_unit_id=v_business_unit_id;
  return result;
end;
$$;

revoke execute on function public.admin_available_sales_cards() from public,anon;
grant execute on function public.admin_available_sales_cards() to authenticated;
revoke execute on function public.admin_assign_sales_card_by_code(uuid,text) from public,anon,authenticated;
grant execute on function public.admin_assign_sales_card_by_code(uuid,text) to authenticated;
revoke execute on function public.admin_create_sales_with_cards(text,text,text,uuid[]) from public,anon;
grant execute on function public.admin_create_sales_with_cards(text,text,text,uuid[]) to authenticated;
revoke execute on function public.admin_dashboard_card_sales_attribution() from public,anon;
grant execute on function public.admin_dashboard_card_sales_attribution() to authenticated;
