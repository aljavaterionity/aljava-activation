# ALJAVA TERIONITY — Operational Readiness

This document defines the production flow and acceptance checks without changing existing business flow.

## Core flow
1. Product exists in `Product`.
2. Admin creates one or many cards in `Cards`.
3. Card gets activation, QR, and NFC links.
4. Customer scans/taps the card.
5. Card activation changes status to `active`.
6. Activation creates one transaction per card.
7. Dashboard reads cards, scans/taps, transactions, customers, and products.
8. Reset Dashboard clears operational data but preserves `Product` and admin access.

## Safety rules
- Do not delete `Product` during dashboard reset.
- Do not create duplicate transactions when a card is already active.
- Do not introduce a second navigation handler for an existing menu item.
- Keep all destructive actions behind explicit confirmation.
- Keep the production publishable Supabase key client-side only; never add a service-role key to frontend code.

## Pre-go-live checklist
- Create a product.
- Create 1 card and verify generated links.
- Create multiple cards with Qty and verify sequential codes.
- Activate a card once and confirm exactly one transaction is created.
- Scan/tap cards and verify dashboard counters.
- Verify revenue equals transaction selling price × quantity under the current dashboard definition.
- Delete one card and verify it disappears from the dashboard.
- Use Reset Dashboard and confirm operational data is cleared while products remain.
- Log out and log in again from desktop and mobile.
- Test all main-menu and settings actions on a phone-sized viewport.
