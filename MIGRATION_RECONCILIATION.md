# ALJAVA Migration Reconciliation

Date: 2026-09-08
Branch: `audit/full-audit-20260908`

## Status

**REVIEW_REQUIRED — migration history drift is confirmed.**

The live Supabase project `lbzwmcxwxummitldxucj` contains a substantially larger migration history than the repository's current `supabase/migrations` directory.

The live project contains migrations beginning on **2026-08-29**, while the repository tree currently starts with migrations dated **2026-09-06**. A direct repository search also found no repository file for the live migration `allow_admin_dashboard_reads`.

## Confirmed live migration range

The live project currently reports migrations from:

- `20260829095326_allow_admin_dashboard_reads`
- through
- `20260908021750_audit_add_sales_assignment_assigned_by_index`

The live history includes many security, RLS, business-scope, finance, customer-pipeline, project, sales-workspace, and RPC hardening migrations that are not represented by the repository's current migration directory.

## Repository migrations currently visible

The repository migration tree contains the newer sales/audit migrations, including:

- `20260906000000_sales_workspace.sql`
- `20260906220549_add_whatsapp_to_admin_sales_create.sql`
- `20260907001000_fix_sales_card_legacy_scope.sql`
- `20260907020000_fix_sales_creation_code_conflict.sql`
- `20260907020100_fix_sales_creation_nullable_fields.sql`
- `20260907050000_add_atomic_sales_create_with_card_picker.sql`
- `20260907053000_add_dashboard_card_sales_attribution.sql`
- `20260907060000_sales_management_v2.sql`
- `20260907090000_fix_sales_workspace_management_robustness_v2.sql`
- `20260907114000_grant_reset_admin_data_to_authenticated.sql`
- `20260908200000_fix_reset_dashboard_privileged_dependencies.sql`
- plus the audit hardening/index migrations added during this audit branch.

## Why this must not be auto-fixed

The live database is already carrying schema/state produced by historical migrations that are not reproducible from the current repository migration directory.

Automatically recreating, renaming, deleting, or rewriting those migrations could:

1. produce a false migration history;
2. execute DDL twice against production;
3. change RLS/RPC/security semantics;
4. make rollback and future deployment less reliable;
5. destroy historical provenance needed to understand why the current schema exists.

Therefore **no historical migration has been deleted or rewritten** as part of this audit.

## Required resolution before declaring 100% complete

1. Export/recover the authoritative SQL for every live migration missing from Git.
2. Compare each recovered migration against the current production schema and object definitions.
3. Reconstruct a clean, ordered repository migration history in a separate reconciliation effort.
4. Verify the reconstructed history against a fresh non-production database.
5. Only after that validation should the project adopt the reconciled migration tree as its deployment source of truth.

## Current decision

**Do not modify production migration history further for reconciliation alone.**

The safe state is to keep the live database intact, preserve all existing migrations, document the drift, and perform reconciliation as a dedicated controlled migration-history project.

## Audit conclusion

This is a real architecture/reproducibility issue, not a reason to declare the application broken. Runtime database integrity checks and the audit hardening already performed remain valid, but the repository is not yet a complete reproducible representation of production's historical schema evolution.
