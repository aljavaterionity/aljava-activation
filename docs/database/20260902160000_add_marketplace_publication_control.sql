-- ALJAVA Marketplace publication control
-- Applied to production via Supabase migration: add_marketplace_publication_control
-- Additive only: preserves existing products as marketplace-visible by default.

alter table public."Product"
  add column if not exists marketplace_enabled boolean not null default true;

create or replace function public.get_marketplace_catalog()
returns jsonb
language sql
stable
security definer
set search_path = public, auth, extensions
as $function$
  select coalesce(jsonb_agg(jsonb_build_object(
    'business_id', b.id,
    'business_name', b.name,
    'business_slug', b.slug,
    'business_description', b.description,
    'product_id', p.id,
    'product_code', p.product_code,
    'product_name', p.name,
    'category', p.category,
    'selling_price', p.selling_price
  ) order by b.name, p.name), '[]'::jsonb)
  from public.business_units b
  join public."Product" p on p.business_unit_id = b.id
  where b.status = 'active'
    and b.unit_type = 'business'
    and p.marketplace_enabled = true;
$function$;

revoke execute on function public.get_marketplace_catalog() from public, anon;
grant execute on function public.get_marketplace_catalog() to authenticated;
