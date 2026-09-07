# ALJAVA — Full Audit Report

**Audit mode:** Discovery / Phase 1 only  
**Date:** 2026-09-08  
**Repository:** `aljavaterionity/aljava-activation`  
**Branch:** `audit/full-audit-20260908`  
**Baseline commit:** `0a2d4966ef096553de8ad4ccb1d35c6c1995a2d3`

## 1. Audit Rules

No production cleanup, destructive schema change, or feature addition is performed during this discovery step. Anything uncertain is classified as `REVIEW_REQUIRED` until dependency/runtime evidence is sufficient.

## 2. Repository Baseline

The current repository contains:

- HTML entry points: `index.html`, `landing.html`, `login.html`, `admin.html`, `category.html`
- Shared frontend configuration: `assets/app-config.js`
- Admin/application JavaScript modules including cards, customers, products, sales, operations, analytics, menu and reset flows
- A large CSS surface split across dashboard, sales, cards, customers, theme, menu and workspace files
- Supabase migration files under `supabase/migrations/`
- Deployment configuration for Vercel and Wrangler
- Operational/admin documentation files

The recursive Git tree is currently readable and GitHub reports it as not truncated. fileciteturn1file0L2-L10

## 3. Initial Architecture Map

| Area | Entry | Current implementation | Initial status |
|---|---|---|---|
| Public card activation | `index.html` | Inline JS + Supabase Edge Function HTTP calls | REFACTOR / REVIEW |
| Admin login | `login.html` | Shared Supabase client + inline auth/admin check | REFACTOR |
| Admin application | `admin.html` | One HTML shell + many script/CSS modules | KEEP / REFACTOR |
| Admin core | `assets/admin.js` | Auth, navigation, state, data loading, dashboard rendering | REFACTOR |
| Shared core | `assets/app-config.js` | Supabase config/client + shared helpers | KEEP / SINGLE SOURCE OF TRUTH |
| Cards | `assets/card-manager.js` | Card generation + direct `Cards` insert | REFACTOR / SECURITY REVIEW |
| Reset | `assets/reset-dashboard.js` | RPC reset + multiple event hooks + MutationObserver | HIGH REFACTOR |
| Sales | `assets/sales-dashboard.js` and related modules | Dynamic UI + transaction reporting | REFACTOR |

`admin.html` loads `app-config.js` before the admin modules and currently includes a large number of CSS/JS assets. fileciteturn3file0L2-L6

## 4. Confirmed Findings So Far

### F-001 — Duplicate database table families

**Severity:** HIGH  
**Classification:** `REVIEW_REQUIRED`

The live database contains both `public."Cards"` and legacy `public.cards`. The legacy table currently contains **0 rows**, while `public."Cards"` contains **5 rows**. Do not drop the legacy table until every source-code reference, RPC, trigger, migration and relationship has been verified.

### F-002 — Shared Supabase configuration exists, but public activation duplicates configuration

**Severity:** HIGH  
**Classification:** `REFACTOR`

`assets/app-config.js` is the current shared source for Supabase URL/key, activation base URL and the browser Supabase client. fileciteturn4file0L2-L6

`index.html` independently hardcodes the Supabase URL, publishable key and two Edge Function URLs. This is a configuration drift risk and violates the requested Single Source of Truth principle. The key shown is a publishable client key, not a service-role secret, but the duplication still needs cleanup. fileciteturn19file0L2-L2

### F-003 — Reset dashboard has multiple overlapping event mechanisms

**Severity:** HIGH  
**Classification:** `REFACTOR`

`assets/reset-dashboard.js` combines direct click/pointer listeners, `onclick`, delegated click/pointer/touch listeners, a `MutationObserver`, and several delayed rebinding attempts. This is excessive for one button and is a likely source of duplicate invocation and difficult-to-debug mobile behaviour. fileciteturn21file0L2-L6

### F-004 — Card creation is client-side direct insert

**Severity:** HIGH  
**Classification:** `REFACTOR / SECURITY REVIEW`

`assets/card-manager.js` generates critical card fields in the browser and directly inserts into `public."Cards"`. Current RLS can permit admins, so this is not automatically a vulnerability; however, card status, product/customer relationships and activation URLs should be reviewed for server-side authority and integrity. fileciteturn22file0L2-L6

### F-005 — Previous Cards RLS error requires historical/root-cause verification

**Severity:** HIGH  
**Classification:** `REVIEW_REQUIRED`

Current `Cards` RLS has an authenticated `ALL` policy using `is_admin_user() OR has_business_permission(business_unit_id, 'card.manage')` for visibility and writes. Current `is_admin_user()` checks both `admin_profiles` and `profiles` for an `admin` role. Therefore the historical `new row violates row-level security policy for table "Cards"` error cannot be attributed to the current policy without tracing the failing session and historical policy state.

### F-006 — Live migration history is much larger than repository migration set

**Severity:** CRITICAL  
**Classification:** `REVIEW_REQUIRED`

The live project has a long migration history from August 29 through September 7, covering repeated RLS, reset, transaction, payment, business-scope and sales changes. The repository contains only a small later subset of migration files. This is a production/repository schema source-of-truth problem until proven otherwise.

Before schema cleanup, determine whether the history was intentionally squashed, manually applied, or simply omitted from the repository. A fresh environment must be reproducible without silently diverging from production.

### F-007 — Repeated reset/dashboard fixes indicate accumulated patching

**Severity:** MEDIUM/HIGH  
**Classification:** `REFACTOR`

Recent Git history shows repeated reset-dashboard hardening and cache-busting commits immediately before the current baseline. This is a maintenance signal that the reset flow should be root-cause refactored instead of receiving another isolated patch.

### F-008 — `Cards` primary key is structurally unusual

**Severity:** HIGH  
**Classification:** `REVIEW_REQUIRED / DATABASE REFACTOR`

The live `public."Cards"` table currently has a composite primary key:

`PRIMARY KEY (id, card_code, status, product_type, created_at)`

while it also has a unique `card_code` index and a separate unique `id` index. Other relationships reference `Cards.id`. This is an unusual and unnecessarily complex identity model for a card entity and may explain why a separate `cards_id_unique_idx` exists.

Do not change this in-place until every foreign key, RPC and query dependency is mapped. The likely target architecture is a single stable identity key, but that must be proven and migrated safely.

### F-009 — Duplicate/redundant indexes exist

**Severity:** MEDIUM  
**Classification:** `REVIEW_REQUIRED`

Examples observed in the live database include:

- `Cards`: primary-key composite index + unique `id` index + unique `card_code` index + an additional non-unique `idx_cards_card_code` on the same column.
- `sales_code_assignments`: two separate unique partial indexes enforcing the same `(card_id) WHERE status='active'` rule.
- `transaction_payment_audit`: separate `admin_id` index and a composite `(admin_id, created_at DESC)` index that may overlap.
- `CardScans`: several single-column and composite indexes whose actual query benefit needs verification.

No index is to be dropped merely because it looks redundant; query plans and dependency history must be checked first.

## 5. Live Database Inventory

### Public tables observed

- `CardScans`
- `Cards`
- `Customers`
- `Product`
- `Sales`
- `Subscriptions`
- `Transactions`
- `admin_card_actions`
- `admin_profiles`
- `app_permissions`
- `app_role_permissions`
- `app_roles`
- `business_activity_logs`
- `business_memberships`
- `business_units`
- `cards` (legacy)
- `customer_pipeline`
- `finance_entries`
- `profiles`
- `project_tasks`
- `projects`
- `sales_code_assignments`
- `transaction_payment_audit`

Supabase platform-owned schemas are also present and are not application cleanup candidates by default.

### Current operational row counts verified

- `public."Cards"`: 5
- `public.cards`: 0
- `public."Sales"`: 2

A duplicate `card_code` check on `public."Cards"` returned no duplicates.

## 6. RLS Inventory — Current Live State

The current public RLS surface includes policies for operational tables, audit tables, business authorization tables, ERP/project/finance tables and legacy `cards`.

Important observations:

- `Cards` uses an admin/business-manager write rule.
- `Customers`, `Product`, `Sales`, `Subscriptions`, and `Transactions` use business-scoped permissions plus admin bypass.
- Legacy `cards` has a separate admin-oriented policy surface.
- `CardScans` allows constrained anonymous/authenticated scan/tap inserts while reads are business/admin scoped.

The final RLS matrix will be produced only after grants, helper functions, RPC execution privileges and application references are verified together.

## 7. RPC / Function Inventory — Current Live State

Security-sensitive live functions include:

- `is_admin_user`
- `is_admin`
- `has_business_permission`
- `is_business_member`
- `record_transaction_payment`
- `activate_card_atomic`
- `admin_reset_dashboard`
- `reset_admin_data`
- sales management/assignment RPCs
- dashboard/reporting RPCs
- project/finance automation functions
- transaction/card activation trigger functions

Many are `SECURITY DEFINER`. Each requires a dedicated audit of `search_path`, execution grants, authorization guards and privilege boundaries.

## 8. Payment / Transaction Initial Findings

`record_transaction_payment` is a `SECURITY DEFINER` RPC returning payment status, paid amount and remaining amount. It should remain the authoritative mutation path unless a later audit proves a safer design.

The sales dashboard calculates displayed revenue/receivable values client-side from transaction fields. This is acceptable for presentation, but financial mutation and authoritative payment validation must remain server/database controlled.

## 9. Classification Snapshot

| Finding / Object | Classification | Reason |
|---|---|---|
| `assets/app-config.js` | KEEP | Shared config/client source |
| `assets/admin.js` | REFACTOR | Broad controller responsibilities |
| `assets/card-manager.js` | REFACTOR | Direct critical-field insert; server authority review required |
| `assets/reset-dashboard.js` | REFACTOR | Multiple overlapping handlers + MutationObserver |
| `public."Cards"` | KEEP / DATABASE REFACTOR REVIEW | Active table, but identity/index design needs review |
| `public.cards` | REVIEW_REQUIRED | Legacy table, currently empty |
| `record_transaction_payment` | KEEP / SECURITY REVIEW | Critical payment RPC |
| Historical Supabase migrations absent from repo | REVIEW_REQUIRED / CRITICAL | Production/repository divergence |
| Public activation config in `index.html` | REFACTOR | Duplicate configuration source |
| Duplicate indexes | REVIEW_REQUIRED | Need query/dependency proof before removal |

## 10. No-Delete List During Remaining Audit

Until dependency verification is complete, do not delete:

- `public.cards`
- any Supabase migration
- any RPC/function
- any CSS asset merely because it looks redundant
- any JS module merely because it is dynamically loaded
- any deployment/config file
- any audit/admin documentation
- any index identified as redundant without query-plan/dependency evidence

## 11. Phase 1 Remaining Work

1. Read every HTML file completely and map every static/dynamic script/style reference.
2. Read every JS module and build function/event/reference relationships.
3. Read every CSS file and detect selectors/overrides/dead styles.
4. Read all repository Supabase migrations and compare them against live objects.
5. Audit all foreign keys, indexes, constraints and triggers.
6. Audit all RPC definitions, grants, `SECURITY DEFINER`, `search_path` and authorization guards.
7. Verify live data integrity/orphans across operational tables.
8. Trace every reference to legacy `public.cards`.
9. Verify payment atomicity and duplicate/concurrent payment handling.
10. Establish a reproducible migration/source-of-truth strategy.
11. Complete KEEP/REFACTOR/MERGE/REMOVE/REVIEW_REQUIRED for every object.

## 12. Decision Gate

**No production cleanup is authorized by this report yet.**

Correct sequence:

`Discovery → Dependency Map → Classification → Plan → Cleanup → Refactor → Bug Fix → Test → Re-Audit → Final Report`
