# ALJAVA TERIONITY — Business Foundation

Phase 1 establishes ALJAVA as the parent business and makes the existing Google Review Card operation the first business unit. The model is additive so the current card activation/admin flow remains intact.

## Business hierarchy

```text
ALJAVA (parent)
├── Konsultan Resto & Cafe
├── Kartu Google Review
└── Website & Landing Page
```

New business units can be added under the `ALJAVA` parent without creating a separate application.

## Core database model

- `business_units` — hierarchy, slug, description, active/inactive status.
- `business_memberships` — which authenticated user has which role in a unit.
- `app_roles` — reusable application roles: owner, admin, manager, staff, sales, accounting, viewer.
- `app_permissions` — reusable permission catalog by module.
- `app_role_permissions` — role-to-permission mapping.

Existing operational tables receive an additive `business_unit_id`:

- `Product`
- `Cards`
- `Transactions`
- `Subscriptions`
- `Sales`
- `admin_card_actions`

Existing customers remain global because one customer can potentially buy services from multiple ALJAVA business units.

## Initial mapping

All existing Product/Card/Transaction/Subscription/Sales/admin-card-action records are assigned to `kartu-google-review`, preserving the current ALJAVA Google Review Card operation as the first operational unit.

The existing admin account is attached to the `ALJAVA` parent as `owner` and to `Kartu Google Review` as `admin`.

## Security

The new foundation tables use RLS and are currently admin-only. Business-unit-scoped staff authorization will be introduced in the next authorization phase after the role/permission UI and request-level policies are defined.

Do not expose or accept `business_unit_id`, role, or user identity as a trusted client-side authorization decision. Final authorization must be enforced server-side/database-side.

## Admin UI

`business-hub.html` provides the first management surface for viewing the hierarchy and adding a new business unit. It requires an authenticated admin session and uses the existing shared Supabase client configuration.

The existing `admin.html` remains unchanged in Phase 1 to avoid introducing a second navigation handler or breaking the stable card/customer/product flows. Integration into the existing Main Menu is planned after the foundation is validated.
