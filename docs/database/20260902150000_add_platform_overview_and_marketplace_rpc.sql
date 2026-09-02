create or replace function public.get_platform_overview(p_start timestamptz default null, p_end timestamptz default null)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, auth, extensions
as $$
declare
  v_start timestamptz := coalesce(p_start, '1970-01-01'::timestamptz);
  v_end timestamptz := coalesce(p_end, now());
  v_result jsonb;
begin
  if not public.is_admin_user() then raise exception 'platform_admin_required'; end if;
  select jsonb_build_object(
    'businesses',(select count(*) from public.business_units where status='active'),
    'users',(select count(*) from auth.users),
    'customers',(select count(*) from public."Customers"),
    'products',(select count(*) from public."Product" where created_at between v_start and v_end),
    'cards',(select count(*) from public."Cards" where created_at between v_start and v_end),
    'active_cards',(select count(*) from public."Cards" where lower(coalesce(status,''))='active' and created_at between v_start and v_end),
    'inactive_cards',(select count(*) from public."Cards" where lower(coalesce(status,''))<>'active' and created_at between v_start and v_end),
    'transactions',(select count(*) from public."Transactions" where transaction_date between v_start and v_end),
    'revenue',(select coalesce(sum(greatest(coalesce(selling_price,0),0)*greatest(coalesce(quantity,1),0)),0) from public."Transactions" where lower(coalesce(payment_status,''))='paid' and transaction_date between v_start and v_end),
    'payments',(select coalesce(sum(greatest(coalesce(amount_paid,0),0)),0) from public."Transactions" where transaction_date between v_start and v_end),
    'outstanding',(select coalesce(sum(greatest((greatest(coalesce(selling_price,0),0)*greatest(coalesce(quantity,1),0))-greatest(coalesce(amount_paid,0),0),0)),0) from public."Transactions" where transaction_date between v_start and v_end and lower(coalesce(payment_status,''))<>'paid'),
    'scans',(select count(*) from public."CardScans" where scanned_at between v_start and v_end),
    'finance_income',(select coalesce(sum(amount),0) from public.finance_entries where entry_type='income' and entry_date between v_start::date and v_end::date),
    'finance_expense',(select coalesce(sum(amount),0) from public.finance_entries where entry_type='expense' and entry_date between v_start::date and v_end::date),
    'projects',(select count(*) from public.projects),
    'open_tasks',(select count(*) from public.project_tasks where lower(coalesce(status,'')) not in ('done','cancelled')),
    'period_start',v_start,'period_end',v_end,
    'top_businesses',coalesce((select jsonb_agg(x order by x->>'revenue' desc) from (select jsonb_build_object('id',b.id,'name',b.name,'revenue',coalesce(sum(case when lower(coalesce(t.payment_status,''))='paid' then greatest(coalesce(t.selling_price,0),0)*greatest(coalesce(t.quantity,1),0) else 0 end),0),'transactions',count(t.id)) x from public.business_units b left join public."Transactions" t on t.business_unit_id=b.id and t.transaction_date between v_start and v_end where b.status='active' group by b.id,b.name order by coalesce(sum(case when lower(coalesce(t.payment_status,''))='paid' then greatest(coalesce(t.selling_price,0),0)*greatest(coalesce(t.quantity,1),0) else 0 end),0) desc limit 10)s),'[]'::jsonb)
  ) into v_result; return v_result;
end; $$;
revoke execute on function public.get_platform_overview(timestamptz,timestamptz) from public;
revoke execute on function public.get_platform_overview(timestamptz,timestamptz) from anon;
grant execute on function public.get_platform_overview(timestamptz,timestamptz) to authenticated;

create or replace function public.get_marketplace_catalog()
returns jsonb language sql security definer stable
set search_path = public, auth, extensions as $$
select coalesce(jsonb_agg(jsonb_build_object('business_id',b.id,'business_name',b.name,'business_slug',b.slug,'business_description',b.description,'product_id',p.id,'product_code',p.product_code,'product_name',p.name,'category',p.category,'selling_price',p.selling_price) order by b.name,p.name),'[]'::jsonb)
from public.business_units b join public."Product" p on p.business_unit_id=b.id where b.status='active';
$$;
grant execute on function public.get_marketplace_catalog() to anon, authenticated;
