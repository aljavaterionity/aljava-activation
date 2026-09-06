-- ALJAVA TERIONITY — Dashboard card sales attribution
-- Shows current holder for pending cards and activating Sales for active cards.

create or replace function public.admin_dashboard_card_sales_attribution()
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_business_unit_id uuid;
  result jsonb;
begin
  if not public.is_admin_user() then raise exception 'unauthorized'; end if;

  select bm.business_unit_id
    into v_business_unit_id
    from public.business_memberships bm
   where bm.user_id=auth.uid()
     and bm.status='active'
     and bm.role in ('owner','admin')
   order by case bm.role when 'owner' then 0 else 1 end, bm.created_at
   limit 1;

  if v_business_unit_id is null then raise exception 'admin_business_unit_required'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'card_id',c.id,
    'card_code',c.card_code,
    'held_by_sales_id',a.sales_id,
    'held_by_sales_name',hs.name,
    'held_at',a.assigned_at,
    'activated_by_sales_id',tx.sales_id,
    'activated_by_sales_name',asales.name,
    'activated_at',coalesce(tx.transaction_date,c.activated_at)
  ) order by c.created_at desc),'[]'::jsonb)
    into result
    from public."Cards" c
    left join lateral (
      select a.sales_id,a.assigned_at
        from public.sales_code_assignments a
       where a.card_id=c.id
         and a.status='active'
       order by a.assigned_at desc
       limit 1
    ) a on true
    left join public."Sales" hs on hs.id=a.sales_id
    left join lateral (
      select t.sales_id,t.transaction_date
        from public."Transactions" t
       where t.card_id=c.id
         and t.sales_id is not null
       order by t.transaction_date asc
       limit 1
    ) tx on true
    left join public."Sales" asales on asales.id=tx.sales_id
   where c.business_unit_id=v_business_unit_id;

  return result;
end;
$$;

revoke execute on function public.admin_dashboard_card_sales_attribution() from public,anon;
grant execute on function public.admin_dashboard_card_sales_attribution() to authenticated;
