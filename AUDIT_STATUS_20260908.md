# ALJAVA Audit Status — 2026-09-08

## Overall

**Audit/hardening completion: ~97.5%**

The application and production database have received the safe, evidence-based cleanup/hardening that could be completed without destructive changes or browser-level regression testing.

## Stage 1 — RPC & Permission Final Verification — COMPLETE

- Audited the privileged RPCs affected by the audit hardening migration.
- Confirmed the current admin UI uses protected Sales RPCs and the reset endpoint.
- Restored `authenticated` EXECUTE only for these confirmed admin API endpoints:
  - `admin_available_sales_cards()`
  - `admin_create_sales_with_cards(text, text, text, uuid[])`
  - `reset_admin_data()`
- Confirmed these functions perform server-side admin authorization checks.
- Kept internal `admin_reset_dashboard()` non-callable directly by `authenticated`; it remains reached through the protected reset wrapper.
- Kept `has_business_permission(...)` executable by `authenticated` because it is required by authorization logic and has already been restored.
- Confirmed key Sales/card attribution RPCs are executable by `authenticated` and remain server-authorized.
- No RLS was disabled and no production data was changed.
- Applied the same forward-only permission correction to Git migration history.

## Completed in this audit

- Created isolated audit branch: `audit/full-audit-20260908`.
- Audited repository structure and frontend/database responsibilities.
- Added audit documentation and classification records.
- Preserved existing working behavior; no force reset and no destructive migration-history rewrite.
- Kept RLS enabled.
- Hardened privileged RPC execution grants, then corrected only the authenticated admin endpoints proven to be required by the UI.
- Added missing `sales_code_assignments.assigned_by` FK index.
- Removed proven duplicate `sales_code_assignments` index.
- Removed proven duplicate `Cards(card_code)` non-unique index because `Cards_card_code_key` already provides the same unique btree access path.
- Rechecked Supabase security/performance advisors after DB changes.
- Rechecked key data-integrity conditions: card/customer/transaction relationships, finance orphans, duplicate card codes, and duplicate active assignments.
- Confirmed live `public.Cards` is the populated card table while legacy `public.cards` is empty.
- Documented migration-history drift between production and Git.
- Simplified the reset dashboard event binding to a single delegated click handler.
- Added dashboard card holder / Sales attribution rendering.

## Remaining REVIEW_REQUIRED gates

### 2. Dashboard data consistency

Verify that dashboard KPIs and summary modules use consistent source data and refresh behavior without changing business semantics.

### 3. Card management final verification

Browser/E2E verification remains required for create, search, assignment, activation, QR/NFC, filtering, and deletion flows.

### 4. Sales Workspace final verification

Browser/E2E verification remains required for add Sales, manage Sales, card assignment/unassignment, status, detail, report, and refresh flows.

### 5. Migration history reconciliation

Production contains historical migrations beginning 2026-08-29 that are not present in the repository migration tree. This must be reconstructed/recovered deliberately; it should not be solved by deleting or rewriting history.

### 6. `Cards` primary-key architecture

Production `public."Cards"` currently has:

`PRIMARY KEY (id, card_code, status, product_type, created_at)`

while also having `UNIQUE(card_code)` and a separate unique index on `id`, and foreign keys reference `Cards.id`.

This is unusual and should be normalized only after a full dependency and migration rehearsal.

### 7. Legacy `public.cards`

The legacy lowercase table is empty but still exists. It should remain untouched until every historical reference, policy, RPC, trigger, and deployment dependency is proven obsolete.

### 8. Frontend runtime regression

Browser automation is not available in the connected environment. Therefore the following cannot honestly be marked runtime-verified from this audit session:

- real login/logout/session persistence;
- card CRUD through the UI;
- exact reproduction/fix verification of the historical Cards RLS error under the user's real session;
- concurrent payment submissions;
- responsive/mobile behavior;
- modal/navigation visual regression;
- console-error smoke test;
- QR ZIP download flow.

### 9. Auth leaked-password protection

Supabase Security Advisor still reports `auth_leaked_password_protection` as WARN. This is an Auth dashboard configuration item and was not silently changed by this audit.

### 10. Multiple permissive RLS policies

Supabase Performance Advisor still reports multiple permissive policies on several business/ERP tables. These are performance warnings, not proof of an authorization bug. They should only be consolidated after comparing the policy predicates and preserving their effective OR semantics.

### 11. Unused indexes

The advisor reports many unused indexes. They are intentionally not bulk-deleted because 'unused' does not prove 'unneeded'; some may support future queries, foreign keys, or operational workloads not represented in the current statistics.

## Latest audit DB changes

- `audit_hardening_revoke_anon_admin_business_units`
- `audit_hardening_revoke_authenticated_admin_sales_functions`
- `audit_hardening_revoke_authenticated_admin_business_units`
- `audit_add_sales_assignment_assigned_by_index`
- `audit_hardening_remove_duplicate_sales_assignment_index`
- `audit_hardening_remove_duplicate_cards_code_index`
- `restore_admin_dashboard_rpc_execute`

## Latest repository audit commits

- `e37ae97` — restore authenticated execute for confirmed admin dashboard RPCs
- `d4cdcb4` — missing sales assignment FK index
- `23c7daf` — audit release documentation
- `ba2090f` — migration drift documentation
- `1b8299d` — duplicate Cards card_code index removal

## Release decision

**Stage 1 is complete. Do not claim 100% production verification yet.**

The current deliverable is an audited/hardened candidate with the permission regression corrected through forward-only migrations. The next stage is Dashboard Data Consistency; it must be handled separately and must not begin until this stage is considered closed.
