# ALJAVA TERIONITY — Operational Runbook

## Core flow (do not reorder)
1. Kelola Produk → create/verify master product.
2. Kelola Kartu → choose product + quantity → generate card codes.
3. Use activation / QR / NFC links generated for each card.
4. Customer activates card → transaction is created by the database flow.
5. Dashboard reads Cards, Transactions, CardScans, Customers and Product.
6. Reset Dashboard clears operational data but preserves Product/admin data.

## Safe modification rules
- Keep `Product` as master data; never include it in dashboard reset.
- Keep `Cards` as the active card table; legacy `public.cards` is compatibility-only until a migration plan is completed.
- Do not add DOM `MutationObserver` logic to navigation or whole-document binding.
- Prefer one event handler per control and one owner per feature.
- Any database DDL change must be made through a migration.
- Test these flows after frontend changes: login, dashboard load, product create, card create (qty > 1), card delete, activation, scan/tap, reset dashboard.

## Mobile acceptance checklist
- Admin page opens on a phone without horizontal page scrolling.
- Main menu is reachable with one tap.
- Forms remain usable with the mobile keyboard.
- Tables scroll horizontally inside their own container.
- Primary actions have comfortable touch targets.
- Refresh/reload does not duplicate event handlers.

## Release discipline
1. Make a focused change.
2. Commit to `main`.
3. Wait for Vercel production deployment to be READY.
4. Hard-refresh the admin page.
5. Run the operational acceptance checklist above.
6. Only then start the next change.
