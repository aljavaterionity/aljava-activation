# ALJAVA — Cleanup / Refactor Plan

## KEEP

- Core entry pages and current activation flow.
- `assets/app-config.js` as shared browser configuration/client.
- Core operational tables: `Cards`, `Customers`, `Product`, `Sales`, `Transactions`, `CardScans`.
- Business authorization and audit tables while their features remain part of the current app.
- `record_transaction_payment` and `activate_card_atomic` as server-authoritative critical operations.

## REFACTOR

- Move public activation constants into shared configuration without exposing secrets.
- Simplify `reset-dashboard.js` to one event path; remove its MutationObserver/delayed rebinding once the replacement is proven.
- Reduce the number of sales UI hardening/patch layers and make one explicit owner for each screen.
- Separate dashboard data access from rendering in `admin.js` as the module grows.
- Move card creation of critical derived fields toward server-side authority after RLS/business-scope verification.
- Normalize financial display calculations around a shared read model while keeping mutations server-side.

## MERGE / POSSIBLE REMOVE AFTER VISUAL QA

- Legacy sales theme/loader/polish layers that only duplicate the authoritative sales theme.
- Deprecated `operations-dashboard-ui.css` if no runtime reference remains after final dependency scan.
- Redundant chart/theme style injection where static CSS already owns the same selector.

## REVIEW_REQUIRED

- Legacy `public.cards` table.
- Composite `Cards` primary key.
- Historical Supabase migrations missing from repository.
- Unused indexes that are not proven duplicates.
- Any dynamically loaded module whose runtime reference cannot be statically proven.

## Safety Gate

No destructive database migration should be executed for the REVIEW_REQUIRED items until production dependencies and migration reproducibility are resolved.
