# ALJAVA — Review Required

These items are intentionally **not deleted or destructively changed** because the available repository/runtime evidence does not prove they are safe to remove.

## Database

- `public.cards`: legacy table, currently empty. It is referenced by the reset RPC and has its own trigger/RLS surface. Keep until the legacy migration/function/reference chain is intentionally retired.
- Composite primary key on `public."Cards"`: currently `(id, card_code, status, product_type, created_at)`. A unique `id` index also exists and foreign keys target `id`. Schema normalization requires a controlled migration and dependency validation.
- Repository migration history vs live migration history: live Supabase has a much larger migration sequence than the repository tree. Do not claim the repository is a complete reproducible schema until the missing historical migrations are recovered or the schema is intentionally baselined.

## Frontend

- CSS files with names suggesting polish/theme layers: keep until selector-level usage and visual regression testing prove they can be consolidated safely.
- Dynamically loaded sales modules: keep until the runtime dependency chain is replaced by explicit module imports/bundling.
- Public activation inline code: refactor target, not removal target; it is the public activation entry point.

## Security

- `get_admin_business_units`, sales admin RPCs and business helper RPCs were tightened by revoking direct API execution where the application does not require those endpoints. Any future server-side call path must use an intentionally granted function.
- Supabase Auth leaked-password protection remains a dashboard-level configuration item and was not silently changed by this code/database audit.
