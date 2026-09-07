# ALJAVA — Final Verification Matrix

Audit date: 2026-09-08

## Verified statically / against live schema

- Shared Supabase client exists in `assets/app-config.js` and admin modules consume it.
- Admin login uses `signInWithPassword` and then `is_admin_user()`.
- Payment mutation is server-side through `record_transaction_payment`, with row locking (`FOR UPDATE`) and overpayment rejection.
- Card activation uses an atomic server-side activation function and card-activation transaction trigger path.
- RLS remains enabled on application tables; the audit did not disable RLS.
- Proven duplicate partial index on `sales_code_assignments` was removed.
- Direct API execution was revoked for privileged SECURITY DEFINER functions that are intended to be called only from trusted application paths. Re-run application flows after deployment to confirm each required client path is now routed through an allowed mechanism.
- Security advisor re-check reduced the reported findings to Supabase Auth leaked-password protection.

## Requires real browser/user-session testing

The connected tools do not provide a browser automation session. Therefore these cannot honestly be marked as runtime-verified:

- valid/invalid login in an actual browser
- logout/session persistence in browser
- card create/read/update/delete through UI
- historical Cards RLS reproduction under the exact failing user
- payment duplicate/concurrent browser requests
- responsive/mobile UI
- modal/navigation visual regression
- console-error smoke test
- QR ZIP download in a browser

These remain explicit manual QA gates rather than being falsely marked PASS.
