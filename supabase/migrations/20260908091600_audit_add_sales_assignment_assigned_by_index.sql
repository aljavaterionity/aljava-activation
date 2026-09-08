-- Audit hardening: cover the FK used by sales_code_assignments.assigned_by.
-- This is a performance-only change; no data or RLS behavior is changed.
create index if not exists sales_code_assignments_assigned_by_idx
  on public.sales_code_assignments (assigned_by);
