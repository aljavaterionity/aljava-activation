alter table public."Sales"
  alter column whatsapp set default '';

create or replace function public.admin_create_sales(p_name text, p_sales_code text)
returns table(id uuid, sales_code text, name text, status text, created_at timestamptz)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_business_unit_id uuid;
  v_name text := btrim(p_name);
  v_code text := upper(btrim(p_sales_code));
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

  if exists (
    select 1
    from public."Sales" s
    where lower(s.sales_code) = lower(v_code)
  ) then
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

  return query
  insert into public."Sales" (sales_code, name, whatsapp, status, business_unit_id, created_at)
  values (v_code, v_name, '', 'active', v_business_unit_id, now())
  returning "Sales".id, "Sales".sales_code, "Sales".name, "Sales".status, "Sales".created_at;
end;
$$;

revoke execute on function public.admin_create_sales(text,text) from anon, public;
grant execute on function public.admin_create_sales(text,text) to authenticated;
