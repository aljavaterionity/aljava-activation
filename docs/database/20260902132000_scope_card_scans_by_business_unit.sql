-- ALJAVA TERIONITY — Scope CardScans by business unit
-- Additive migration: preserves existing scan events and anonymous INSERT behavior.

alter table public."CardScans" add column if not exists business_unit_id uuid;

update public."CardScans" s
set business_unit_id = c.business_unit_id
from public."Cards" c
where s.business_unit_id is null
  and c.business_unit_id is not null
  and (s.card_id = c.id or (s.card_id is null and s.card_code = c.card_code));

create index if not exists idx_cardscans_business_unit_id on public."CardScans" (business_unit_id);

create or replace function public.set_card_scan_business_unit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_unit_id uuid;
begin
  if new.card_id is not null then
    select c.business_unit_id into v_business_unit_id
    from public."Cards" c
    where c.id = new.card_id;
  end if;

  if v_business_unit_id is null and new.card_code is not null then
    select c.business_unit_id into v_business_unit_id
    from public."Cards" c
    where c.card_code = new.card_code
    order by c.created_at desc nulls last
    limit 1;
  end if;

  if v_business_unit_id is not null then
    new.business_unit_id := v_business_unit_id;
  end if;
  return new;
end;
$$;

revoke all on function public.set_card_scan_business_unit() from public;
grant execute on function public.set_card_scan_business_unit() to anon, authenticated;

drop trigger if exists set_card_scan_business_unit_before_insert on public."CardScans";
create trigger set_card_scan_business_unit_before_insert
before insert on public."CardScans"
for each row execute function public.set_card_scan_business_unit();

alter table public."CardScans"
  drop constraint if exists cardscans_business_unit_id_fkey;
alter table public."CardScans"
  add constraint cardscans_business_unit_id_fkey
  foreign key (business_unit_id) references public.business_units(id) on delete set null;

alter table public."CardScans" enable row level security;

drop policy if exists "Business members can view card scans" on public."CardScans";
create policy "Business members can view card scans"
on public."CardScans"
for select to authenticated
using (
  business_unit_id is not null
  and public.has_business_permission(business_unit_id, 'card.view')
);
