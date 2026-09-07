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

The recursive Git tree is currently cleanly readable and is not marked truncated by GitHub. fileciteturn1file0L2-L10

## 3. Initial Architecture Map

### Frontend entry points

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

The live database contains both:

- `public."Cards"` — UUID-based current card model
- `public.cards` — legacy bigint-based table

The legacy `public.cards` table currently contains **0 rows**, while `public."Cards"` contains **5 rows**. This strongly suggests a legacy object remains in the live schema, but it must not be dropped until every code path, function, trigger, migration and historical dependency is verified.

The current migration history explicitly refers to `public."Cards"` and describes legacy-card compatibility separately, reinforcing that this is a migration/architecture boundary rather than something safe to delete immediately.

### F-002 — Shared Supabase configuration exists, but public activation duplicates configuration

**Severity:** HIGH  
**Classification:** `REFACTOR`

`assets/app-config.js` is a shared source for the Supabase URL/key and activation base URL and creates the shared client. fileciteturn4file0L2-L6

However, `index.html` independently hardcodes:

- Supabase project URL
- publishable key
- Edge Function URLs

This creates a second configuration source and makes future environment/config changes prone to drift. The public publishable key is not equivalent to a service-role secret, but the duplication itself violates the requested Single Source of Truth rule. fileciteturn19file0L2-L2

### F-003 — Reset dashboard has multiple overlapping event mechanisms

**Severity:** HIGH  
**Classification:** `REFACTOR`

`assets/reset-dashboard.js` currently combines:

- direct `click` listener
- direct `pointerup` listener
- `onclick` assignment
- delegated `pointerup`
- delegated `touchend`
- delegated `click`
- MutationObserver rebinding
- delayed rebinding at 250/1000/2000 ms

This is a strong indication of accumulated defensive patches and creates a realistic risk of duplicate invocation, racey UI behaviour and unnecessary DOM observation. The file also logs reset activation and contains cache-busting style recovery logic. fileciteturn21file0L2-L6

**Action:** consolidate to one deterministic binding strategy after verifying the original mobile failure mode.

### F-004 — Card creation is client-side direct insert

**Severity:** HIGH  
**Classification:** `REFACTOR / SECURITY REVIEW`

`assets/card-manager.js` generates card rows in the browser and inserts them directly into `public."Cards"`. The current RLS policy permits authenticated admins through `is_admin_user()`, so this is not automatically insecure; however, critical fields such as status, URLs and relationships are assembled client-side. fileciteturn22file0L2-L6

The correct final design must be determined from the full schema/RLS/function audit rather than simply disabling RLS or adding permissive policies.

### F-005 — Previous Cards RLS error requires historical/root-cause verification

**Severity:** HIGH  
**Classification:** `REVIEW_REQUIRED`

The live `public."Cards"` table currently has an authenticated `ALL` policy whose condition is `is_admin_user() OR has_business_permission(business_unit_id, 'card.manage')` for both visibility and write checks. The live `is_admin_user()` function checks both `admin_profiles` and `profiles` for an `admin` role. This means the previously observed `new row violates row-level security policy for table "Cards"` cannot be assumed to be caused by the current policy alone.

The remaining audit must verify:

1. the exact authenticated user context used when the failure occurred;
2. whether `is_admin_user()` returned true at that time;
3. whether an older policy was active during the failure;
4. whether the inserted row had a business scope that changed policy evaluation;
5. whether there were duplicate/competing policies before the latest migrations.

Do **not** disable RLS as a workaround.

### F-006 — Live migration history is much larger than repository migration set

**Severity:** CRITICAL  
**Classification:** `REVIEW_REQUIRED`

The live Supabase project reports a long migration history spanning August 29 through September 7, including many iterative security/RLS/reset/sales fixes. The repository currently contains only a small set of later migration files.

This creates a potentially serious source-of-truth problem: the repository migration directory is not currently a complete historical representation of the live database migration history.

Before any schema cleanup, we must establish whether:

- historical migrations were intentionally squashed/removed;
- the repository is missing migrations;
- migrations were applied manually;
- the live project contains objects that are not reproducible from the repository;
- destructive cleanup would make a fresh environment diverge from production.

No migration deletion should occur until this is resolved.

### F-007 — Repeated reset/dashboard fixes indicate accumulated patching

**Severity:** MEDIUM/HIGH  
**Classification:** `REFACTOR`

Recent Git history contains a sequence of reset-dashboard fixes and cache-busting commits immediately before the current baseline, including repeated attempts to harden reset binding and mobile confirmation. This does not prove a functional defect by itself, but it is a strong maintenance signal that the reset subsystem should be treated as a root-cause refactor target rather than patched again. 

## 5. Live Database Inventory

### Public tables observed

Current live public tables include:

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

Supabase also contains platform-owned `auth`, `storage`, `realtime`, `extensions`, `vault`, and migration metadata tables. These are not application cleanup candidates by default.

### Current operational row counts verified

- `public."Cards"`: 5
- `public.cards`: 0
- `public."Sales"`: 2

A duplicate `card_code` check on `public."Cards"` currently returned no duplicate codes.

## 6. RLS Inventory — Current Live State

The current public RLS surface includes explicit policies for:

- `CardScans`
- `Cards`
- `Customers`
- `Product`
- `Sales`
- `Subscriptions`
- `Transactions`
- card audit tables
- business authorization tables
- ERP/project/finance tables
- legacy `cards`

Important observations:

- Current `Cards` uses an admin/business-manager write rule.
- Current `Customers`, `Product`, `Sales`, `Subscriptions`, and `Transactions` use business-scoped permissions plus admin bypass.
- Legacy `cards` has a separate admin-oriented policy surface.
- `CardScans` allows anonymous/authenticated insertion of constrained scan/tap events while reads are business/admin scoped.

The full final RLS matrix will be produced after verifying table ownership, grants, helper functions and actual application usage together.

## 7. RPC / Function Inventory — Current Live State

The live project contains security-sensitive functions including:

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

Many of the admin and business functions are `SECURITY DEFINER`. These require a dedicated audit of `search_path`, execution grants, authorization checks, and privilege boundaries before any refactor.

## 8. Payment / Transaction Initial Findings

`record_transaction_payment` exists as a `SECURITY DEFINER` RPC and returns payment status, paid amount and remaining amount. The current live database therefore has a server-side payment path that should remain the authoritative mechanism.

The sales dashboard currently calculates displayed revenue/receivable values client-side from transaction fields. That is acceptable for presentation only; financial mutation and authoritative payment calculations must remain server/database controlled.

## 9. Classification Snapshot

| Finding / Object | Classification | Reason |
|---|---|---|
| `assets/app-config.js` | KEEP | Shared config/client source |
| `assets/admin.js` | REFACTOR | Core controller is broad and centralizes multiple responsibilities |
| `assets/card-manager.js` | REFACTOR | Direct critical-field insert; verify server authority |
| `assets/reset-dashboard.js` | REFACTOR | Multiple overlapping handlers + MutationObserver |
| `public."Cards"` | KEEP | Active current card table |
| `public.cards` | REVIEW_REQUIRED | Legacy table, currently empty; dependency audit required |
| `record_transaction_payment` | KEEP / SECURITY REVIEW | Critical payment RPC |
| Historical Supabase migrations absent from repo | REVIEW_REQUIRED / CRITICAL | Production/repository migration divergence |
| Public activation config in `index.html` | REFACTOR | Duplicate configuration source |

## 10. No-Delete List During Remaining Audit

Until dependency verification is complete, do **not** delete:

- `public.cards`
- any Supabase migration
- any RPC/function
- any CSS asset merely because it looks redundant
- any JS module merely because it is dynamically loaded
- any deployment/config file
- any audit/admin documentation

## 11. Phase 1 Remaining Work

The discovery phase is **not yet complete**. Remaining audit work includes:

1. Read every HTML file completely and map every static/dynamic script/style reference.
2. Read every JS module and build function/event/reference relationships.
3. Read every CSS file and detect selectors/overrides/dead styles.
4. Read all repository Supabase migrations and compare them against live objects.
5. Audit all foreign keys, indexes, constraints and triggers.
6. Audit all RPC definitions, grants, `SECURITY DEFINER`, `search_path` and authorization guards.
7. Verify live data integrity/orphans across operational tables.
8. Trace every reference to the legacy `public.cards` table.
9. Verify payment atomicity and duplicate/concurrent payment handling.
10. Establish a reproducible migration/source-of-truth strategy before schema cleanup.
11. Complete the final KEEP/REFACTOR/MERGE/REMOVE/REVIEW_REQUIRED matrix.

## 12. Decision Gate

**No production cleanup is authorized by this report yet.**

The correct sequence remains:

`Discovery → Dependency Map → Classification → Plan → Cleanup → Refactor → Bug Fix → Test → Re-Audit → Final Report`

The audit should proceed from the confirmed root causes above, with the legacy table and migration-history divergence treated as explicit review gates rather than assumptions.
