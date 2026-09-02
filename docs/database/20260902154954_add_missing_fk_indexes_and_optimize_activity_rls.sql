-- Add covering indexes for foreign keys reported by Supabase Performance Advisor.
create index if not exists app_role_permissions_permission_id_idx
  on public.app_role_permissions (permission_id);

create index if not exists business_activity_logs_actor_id_idx
  on public.business_activity_logs (actor_id);

create index if not exists customer_pipeline_created_by_idx
  on public.customer_pipeline (created_by);

create index if not exists finance_entries_created_by_idx
  on public.finance_entries (created_by);

create index if not exists project_tasks_created_by_idx
  on public.project_tasks (created_by);

create index if not exists projects_created_by_idx
  on public.projects (created_by);

create index if not exists projects_customer_id_idx
  on public.projects (customer_id);

-- Avoid per-row re-evaluation of auth.uid() in INSERT RLS.
alter policy activity_logs_insert
  on public.business_activity_logs
  with check (
    business_unit_id is not null
    and public.has_business_permission(business_unit_id, 'activity.manage')
    and actor_id = (select auth.uid())
  );
