-- ALJAVA TERIONITY — Phase 1 business context hardening
-- Applied to production Supabase via migration:
-- propagate_business_unit_on_card_activation
--
-- Purpose: transactions created automatically when a Card is activated must
-- inherit the Card's business_unit_id. Existing data is not modified.

create or replace function public.create_transaction_on_card_activation()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  p record;
begin
  if new.status is distinct from 'active' then
    return new;
  end if;
  if new.customer_id is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'active' and old.customer_id is not null then
    return new;
  end if;

  select id, hpp, selling_price, commission into p
  from public."Product"
  where id = new.product_id
  limit 1;

  if p.id is null then
    raise exception 'Produk untuk kartu % tidak ditemukan.', new.card_code;
  end if;

  insert into public."Transactions" (
    sales_id, customer_id, card_id, product_id, quantity,
    selling_price, hpp, commission, payment_status, amount_paid, transaction_date,
    business_unit_id
  ) values (
    null,
    new.customer_id,
    new.id,
    p.id,
    1,
    coalesce(p.selling_price, 0),
    coalesce(p.hpp, 0),
    coalesce(p.commission, 0),
    'paid',
    coalesce(p.selling_price, 0),
    coalesce(new.activated_at, now()),
    new.business_unit_id
  )
  on conflict (card_id) where card_id is not null do nothing;

  return new;
end;
$$;
