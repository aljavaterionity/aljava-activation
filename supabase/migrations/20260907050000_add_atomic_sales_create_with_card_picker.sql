create unique index if not exists sales_code_assignments_active_card_uidx
  on public.sales_code_assignments(card_id)
  where status = 'active';

create or replace function public.admin_available_sales_cards()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_business_unit_id uuid;
  v_cards jsonb;
begin
  if not public.is_admin_user() then
    raise exception 'unauthorized';
  end if;

  select bm.business_unit_id
    into v_business_unit_id
  from public.business_memberships bm
  where bm.user_id = auth.uid()
    and bm.status = 'active'
    and bm.role in ('owner','admin')
  order by case bm.role when 'owner' then 0 else 1 end, bm.created_at
  limit 1;

  if v_business_unit_id is null then
    raise exception 'admin_business_unit_required';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'card_code', c.card_code,
    'status', c.status,
    'product_type', c.product_type,
    'product_id', c.product_id,
    'product_name', p.name,
    'created_at', c.created_at
  ) order by c.created_at desc), '[]'::jsonb)
    into v_cards
  from public."Cards" c
  left join public."Product" p on p.id = c.product_id
  where c.business_unit_id is not distinct from v_business_unit_id
    and lower(coalesce(c.status,'')) = 'pending'
    and not exists (
      select 1 from public.sales_code_assignments a
      where a.card_id = c.id and a.status = 'active'
    );

  return v_cards;
end;
$$;

create or replace function public.admin_create_sales_with_cards(
  p_name text,
  p_sales_code text,
  p_whatsapp text,
  p_card_ids uuid[] default '{}'::uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_business_unit_id uuid;
  v_name text := btrim(p_name);
  v_code text := upper(btrim(p_sales_code));
  v_whatsapp text := btrim(p_whatsapp);
  v_sales_id uuid;
  v_card_count integer := coalesce(cardinality(p_card_ids), 0);
  v_available_count integer;
  v_cards jsonb;
begin
  if not public.is_admin_user() then
    raise exception 'unauthorized';
  end if;
  if v_name is null or v_name = '' then
    raise exception 'name_required';
  end if;
  if v_code is null or v_code = '' then
    raise exception 'sales_code_required';
  end if;
  if v_code !~ '^[A-Z0-9][A-Z0-9_-]{2,31}$' then
    raise exception 'invalid_sales_code';
  end if;
  if v_whatsapp is null or v_whatsapp = '' then
    raise exception 'whatsapp_required';
  end if;
  if regexp_replace(v_whatsapp, '[^0-9]', '', 'g') !~ '^[0-9]{8,15}$' then
    raise exception 'invalid_whatsapp';
  end if;
  if exists (select 1 from public."Sales" s where lower(s.sales_code) = lower(v_code)) then
    raise exception 'sales_code_exists';
  end if;

  select bm.business_unit_id
    into v_business_unit_id
  from public.business_memberships bm
  where bm.user_id = auth.uid()
    and bm.status = 'active'
    and bm.role in ('owner','admin')
  order by case bm.role when 'owner' then 0 else 1 end, bm.created_at
  limit 1;

  if v_business_unit_id is null then
    raise exception 'admin_business_unit_required';
  end if;

  select count(*)
    into v_available_count
  from public."Cards" c
  where v_card_count > 0
    and c.id = any(p_card_ids)
    and c.business_unit_id is not distinct from v_business_unit_id
    and lower(coalesce(c.status,'')) = 'pending'
    and not exists (
      select 1 from public.sales_code_assignments a
      where a.card_id = c.id and a.status = 'active'
    );

  if v_card_count <> coalesce(v_available_count,0) then
    raise exception 'card_not_available';
  end if;

  insert into public."Sales" (sales_code, name, whatsapp, status, business_unit_id, created_at)
  values (v_code, v_name, v_whatsapp, 'active', v_business_unit_id, now())
  returning id into v_sales_id;

  if v_card_count > 0 then
    insert into public.sales_code_assignments (sales_id, card_id, business_unit_id, assigned_by)
    select v_sales_id, c.id, v_business_unit_id, auth.uid()
    from public."Cards" c
    where c.id = any(p_card_ids)
      and c.business_unit_id is not distinct from v_business_unit_id;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'card_code', c.card_code,
    'product_type', c.product_type,
    'product_name', p.name,
    'status', c.status
  ) order by c.card_code), '[]'::jsonb)
    into v_cards
  from public."Cards" c
  left join public."Product" p on p.id = c.product_id
  where c.id = any(p_card_ids);

  return jsonb_build_object(
    'id', v_sales_id,
    'sales_code', v_code,
    'name', v_name,
    'whatsapp', v_whatsapp,
    'status', 'active',
    'created_at', now(),
    'cards', v_cards
  );
end;
$$;

revoke all on function public.admin_available_sales_cards() from public, anon;
grant execute on function public.admin_available_sales_cards() to authenticated;
revoke all on function public.admin_create_sales_with_cards(text,text,text,uuid[]) from public, anon;
grant execute on function public.admin_create_sales_with_cards(text,text,text,uuid[]) to authenticated;
