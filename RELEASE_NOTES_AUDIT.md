# ALJAVA — Audit Session Release Notes

Date: 2026-09-08
Branch: `audit/full-audit-20260908`

## Changes made in this session

### Security
- Removed anonymous execution of `get_admin_business_units()`.
- Removed authenticated direct execution of privileged admin/business SECURITY DEFINER RPCs that are not intended to be exposed as general client API endpoints.
- Kept RLS enabled; no permissive RLS workaround was introduced.
- Re-ran Supabase security advisors; the remaining reported warning is leaked-password protection being disabled in Auth.

### Database cleanup
- Removed the proven duplicate partial unique index `sales_code_assignments_one_active_card_idx` while retaining `sales_code_assignments_active_card_uidx`.

### Documentation
- `AUDIT_REPORT.md` — discovery findings and architecture baseline.
- `CLEANUP_PLAN.md` — KEEP/REFACTOR/MERGE/REVIEW plan.
- `REVIEW_REQUIRED.md` — unresolved safety gates.
- `FUTURE_IMPROVEMENTS.md` — ideas intentionally not implemented.
- `AUDIT_TEST_MATRIX.md` — verified vs manual-browser QA boundaries.
- `supabase/migrations/20260908210000_audit_hardening.sql` — reproducible record of the database hardening migration.

## Intentionally NOT changed

- No deletion of `public.cards`.
- No destructive change to the composite `Cards` primary key.
- No deletion of repository migrations.
- No rewrite of the frontend into a new framework.
- No new product feature.
- No reset/RLS disabling workaround.

## Important limitation

The connected environment does not expose browser automation, so this session cannot honestly certify UI/runtime tests such as actual login, mobile rendering, card creation through the browser, QR download, or concurrent browser payment requests. Those remain explicit QA gates.
