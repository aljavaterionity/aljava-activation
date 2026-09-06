-- ALJAVA TERIONITY — Sales management, card ownership and activation attribution
-- Adds admin-controlled Sales IDs, card ownership by card_code, and attribution of
-- card activations to the Sales record that currently owns the card.

alter table public."Sales"
  alter column created_at type timestamptz
  using (current_date + created_at::time);

alter table public."Sales"
  add column if not exists sales_code text;

create unique index if not exists sales_sales_code_unique_idx
  on public."Sales" (lower(sales_code))
  where sales_code is not null;

create or replace function public.admin_create_sales(p_name text, p_sales_code text)
returns table(id uuid, sales_code text, name text, status text, created_at timestamptz)
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_business_unit_id uuid;
  v_name text := btrim(p_name);
  v_code text := upper(btrim(p_sales_code));
begin
  if not public.is_admin_user() then raise exception 'unauthorized'; end if;
  if v_name is null or v_name='' then raise exception 'name_required'; end if;
  if v_code is null or v_code='' then raise exception 'sales_code_required'; end if;
  if v_code !~ '^[A-Z0-9][A-Z0-9_-]{2,31}$' then raise exception 'invalid_sales_code'; end if;
  if exists(select 1 from public."Sales" where lower(sales_code)=lower(v_code)) then
    raise exception 'sales_code_exists';
  end if;

  select bm.business_unit_id
    into v_business_unit_id
    from public.business_memberships bm
   where bm.user_id=auth.uid()
     and bm.status='active'
     and bm.role in ('owner','admin')
   order by case bm.role when 'owner' then 0 else 1 end, bm.created_at
   limit 1;

  if v_business_unit_id is null then raise exception 'admin_business_unit_required'; end if;

  return query
  insert into public."Sales"(sales_code,name,status,business_unit_id,created_at)
  values(v_code,v_name,'active',v_business_unit_id,now())
  returning "Sales".id,"Sales".sales_code,"Sales".name,"Sales".status,"Sales".created_at;
end;
$$;

create or replace function public.admin_assign_sales_card_by_code(p_sales_id uuid, p_card_code text)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_card public."Cards"%rowtype;
  v_assignment uuid;
  v_sales_bu uuid;
begin
  if not public.is_admin_user() then raise exception 'unauthorized'; end if;

  select business_unit_id
    into v_sales_bu
    from public."Sales"
   where id=p_sales_id and lower(status)='active';
  if not found then raise exception 'sales_inactive'; end if;

  select * into v_card
    from public."Cards"
   where lower(card_code)=lower(trim(p_card_code))
     and (business_unit_id is not distinct from v_sales_bu)
   limit 1;
  if not found then raise exception 'card_not_found'; end if;

  if exists(select 1 from public.sales_code_assignments where card_id=v_card.id and status='active') then
    raise exception 'card_already_assigned';
  end if;

  insert into public.sales_code_assignments(sales_id,card_id,business_unit_id,assigned_by)
  values(p_sales_id,v_card.id,v_sales_bu,auth.uid())
  returning id into v_assignment;

  return jsonb_build_object(
    'id',v_assignment,
    'card_id',v_card.id,
    'card_code',v_card.card_code,
    'product_type',v_card.product_type,
    'status',v_card.status,
    'assigned_at',now()
  );
end;
$$;

create or replace function public.admin_unassign_sales_card(p_assignment_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public,auth
as $$
begin
  if not public.is_admin_user() then raise exception 'unauthorized'; end if;
  update public.sales_code_assignments
     set status='unassigned', unassigned_at=now()
   where id=p_assignment_id and status='active';
  return found;
end;
$$;

create or replace function public.admin_sales_workspace(p_start timestamptz default null, p_end timestamptz default null)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  result jsonb;
begin
  if not public.is_admin_user() then raise exception 'unauthorized'; end if;

  with sales_base as (
    select s.id,s.sales_code,s.name,s.email,s.whatsapp,s.status,s.created_at,s.business_unit_id
      from public."Sales" s
  ),
  assignment as (
    select a.sales_id,
           count(*) filter(where a.status='active') codes_held,
           count(*) filter(where a.status='active' and lower(coalesce(c.status,''))='active') active_codes,
           string_agg(c.card_code,' ') filter(where a.status='active') code_search
      from public.sales_code_assignments a
      join public."Cards" c on c.id=a.card_id
     group by a.sales_id
  ),
  tx as (
    select t.sales_id,
           count(*) transactions,
           coalesce(sum(t.selling_price*t.quantity),0) revenue,
           coalesce(sum(t.commission),0) commission,
           count(distinct t.card_id) filter(where t.card_id is not null) sold_codes,
           max(t.transaction_date) last_activity,
           string_agg(distinct concat_ws(' ',coalesce(c.business_name,''),coalesce(c.owner_name,''),coalesce(c.whatsapp,'')),' ') customer_search
      from public."Transactions" t
      left join public."Customers" c on c.id=t.customer_id
     where (p_start is null or t.transaction_date>=p_start)
       and (p_end is null or t.transaction_date<=p_end)
     group by t.sales_id
  )
  select jsonb_build_object(
    'sales',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',s.id,
        'sales_code',s.sales_code,
        'name',s.name,
        'email',s.email,
        'whatsapp',s.whatsapp,
        'status',s.status,
        'created_at',s.created_at,
        'business_unit_id',s.business_unit_id,
        'last_activity',t.last_activity,
        'codes_held',coalesce(a.codes_held,0),
        'active_codes',coalesce(a.active_codes,0),
        'sold_codes',coalesce(t.sold_codes,0),
        'transactions',coalesce(t.transactions,0),
        'revenue',coalesce(t.revenue,0),
        'commission',coalesce(t.commission,0),
        'conversion_rate',case when coalesce(a.codes_held,0)>0 then round((coalesce(t.sold_codes,0)::numeric/coalesce(a.codes_held,0)::numeric)*100,1) else 0 end,
        'search_text',concat_ws(' ',s.sales_code,s.name,s.email,s.whatsapp,a.code_search,t.customer_search)
      ) order by s.name)
      from sales_base s
      left join assignment a on a.sales_id=s.id
      left join tx t on t.sales_id=s.id
    ),'[]'::jsonb),
    'totals',jsonb_build_object(
      'total_sales',(select count(*) from sales_base),
      'active_sales',(select count(*) from sales_base where lower(status)='active'),
      'codes_held',(select count(*) from public.sales_code_assignments where status='active'),
      'revenue',(select coalesce(sum(revenue),0) from tx),
      'commission',(select coalesce(sum(commission),0) from tx)
    )
  ) into result;

  return result;
end;
$$;

create or replace function public.admin_sales_detail(p_sales_id uuid,p_start timestamptz default null,p_end timestamptz default null)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare result jsonb;
begin
  if not public.is_admin_user() then raise exception 'unauthorized'; end if;

  select jsonb_build_object(
    'sales',(select to_jsonb(s) from public."Sales" s where s.id=p_sales_id),
    'transactions',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',t.id,
        'transaction_code',t.transaction_code,
        'transaction_date',t.transaction_date,
        'card_id',t.card_id,
        'card_code',c.card_code,
        'product_id',t.product_id,
        'product_name',p.name,
        'customer_id',t.customer_id,
        'customer_name',coalesce(cu.business_name,cu.owner_name),
        'quantity',t.quantity,
        'selling_price',t.selling_price,
        'commission',t.commission,
        'payment_status',t.payment_status,
        'amount_paid',t.amount_paid,
        'sales_id',t.sales_id
      ) order by t.transaction_date desc)
      from public."Transactions" t
      left join public."Cards" c on c.id=t.card_id
      left join public."Product" p on p.id=t.product_id
      left join public."Customers" cu on cu.id=t.customer_id
     where t.sales_id=p_sales_id
       and (p_start is null or t.transaction_date>=p_start)
       and (p_end is null or t.transaction_date<=p_end)
    ),'[]'::jsonb),
    'codes',coalesce((
      select jsonb_agg(jsonb_build_object(
        'assignment_id',a.id,
        'card_id',c.id,
        'card_code',c.card_code,
        'product_type',c.product_type,
        'card_status',c.status,
        'assigned_at',a.assigned_at,
        'unassigned_at',a.unassigned_at,
        'assignment_status',a.status
      ) order by a.status desc,a.assigned_at desc)
      from public.sales_code_assignments a
      join public."Cards" c on c.id=a.card_id
     where a.sales_id=p_sales_id
    ),'[]'::jsonb),
    'summary',jsonb_build_object(
      'codes_held',(select count(*) from public.sales_code_assignments a where a.sales_id=p_sales_id and a.status='active'),
      'available_codes',(select count(*) from public.sales_code_assignments a join public."Cards" c on c.id=a.card_id where a.sales_id=p_sales_id and a.status='active' and lower(coalesce(c.status,''))='pending'),
      'sold_codes',(select count(distinct t.card_id) from public."Transactions" t where t.sales_id=p_sales_id and t.card_id is not null and (p_start is null or t.transaction_date>=p_start) and (p_end is null or t.transaction_date<=p_end)),
      'transactions',(select count(*) from public."Transactions" t where t.sales_id=p_sales_id and (p_start is null or t.transaction_date>=p_start) and (p_end is null or t.transaction_date<=p_end)),
      'revenue',(select coalesce(sum(t.selling_price*t.quantity),0) from public."Transactions" t where t.sales_id=p_sales_id and (p_start is null or t.transaction_date>=p_start) and (p_end is null or t.transaction_date<=p_end)),
      'commission',(select coalesce(sum(t.commission),0) from public."Transactions" t where t.sales_id=p_sales_id and (p_start is null or t.transaction_date>=p_start) and (p_end is null or t.transaction_date<=p_end))
    )
  ) into result;

  return result;
end;
$$;

create or replace function public.create_transaction_on_card_activation()
returns trigger
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  p record;
  v_sales_id uuid;
begin
  if new.status is distinct from 'active' then return new; end if;
  if new.customer_id is null then return new; end if;
  if tg_op='UPDATE' and old.status='active' and old.customer_id is not null then return new; end if;

  select id,hpp,selling_price,commission into p
    from public."Product"
   where id=new.product_id
   limit 1;
  if p.id is null then raise exception 'Produk untuk kartu % tidak ditemukan.',new.card_code; end if;

  select a.sales_id into v_sales_id
    from public.sales_code_assignments a
   where a.card_id=new.id and a.status='active'
   order by a.assigned_at desc
   limit 1;

  insert into public."Transactions"(
    sales_id,customer_id,card_id,product_id,quantity,selling_price,hpp,commission,
    payment_status,amount_paid,transaction_date,business_unit_id
  ) values(
    v_sales_id,new.customer_id,new.id,p.id,1,coalesce(p.selling_price,0),coalesce(p.hpp,0),coalesce(p.commission,0),
    'paid',coalesce(p.selling_price,0),coalesce(new.activated_at,now()),new.business_unit_id
  ) on conflict (card_id) where card_id is not null do nothing;

  return new;
end;
$$;

revoke execute on function public.admin_create_sales(text) from public,anon,authenticated;
revoke execute on function public.admin_create_sales(text,text) from public,anon;
grant execute on function public.admin_create_sales(text,text) to authenticated;
revoke execute on function public.admin_assign_sales_card_by_code(uuid,text) from public,anon;
grant execute on function public.admin_assign_sales_card_by_code(uuid,text) to authenticated;
revoke execute on function public.admin_unassign_sales_card(uuid) from public,anon;
grant execute on function public.admin_unassign_sales_card(uuid) to authenticated;
revoke execute on function public.admin_sales_detail(uuid,timestamptz,timestamptz) from public,anon;
grant execute on function public.admin_sales_detail(uuid,timestamptz,timestamptz) to authenticated;
revoke execute on function public.admin_sales_workspace(timestamptz,timestamptz) from public,anon;
grant execute on function public.admin_sales_workspace(timestamptz,timestamptz) to authenticated;
