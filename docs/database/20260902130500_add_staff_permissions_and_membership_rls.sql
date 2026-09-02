-- ALJAVA TERIONITY — Staff authorization hardening
-- Adds staff-specific permissions and business-scoped membership policies.
-- Existing admin policy remains intact.

insert into public.app_permissions (code, name, module, description)
values
  ('staff.view', 'Lihat Staff', 'staff', 'Melihat membership dan akses staff dalam unit bisnis.'),
  ('staff.manage', 'Kelola Staff', 'staff', 'Menambah, mengubah, atau menonaktifkan membership staff dalam unit bisnis.')
on conflict (code) do nothing;

insert into public.app_role_permissions (role_id, permission_id)
select r.id, p.id
from public.app_roles r
join public.app_permissions p on p.code in ('staff.view','staff.manage')
where r.code in ('owner','admin','manager')
on conflict do nothing;

create policy "Business members can view staff memberships"
on public.business_memberships
for select to authenticated
using (public.has_business_permission(business_unit_id, 'staff.view'));

create policy "Business managers can manage staff memberships"
on public.business_memberships
for all to authenticated
using (public.has_business_permission(business_unit_id, 'staff.manage'))
with check (public.has_business_permission(business_unit_id, 'staff.manage'));
