# ALJAVA — Future Improvements

Ideas discovered during the full audit that are intentionally **not implemented** because the audit scope is cleanup, refactor, security, stability and bug fixing only.

- Move the frontend from multiple dynamically injected modules toward an explicit module/dependency graph if the application grows further.
- Consider server-generated card access URLs/QR metadata if operational requirements make client generation undesirable.
- Add automated browser E2E tests for login, card creation/activation, payments, sales assignment and reset.
- Add CI checks for duplicate DOM IDs, broken asset references and JavaScript syntax/runtime smoke tests.
- Consider a generated database type layer to reduce string-based table/column drift.
- Consider separating ERP/project/finance modules from the core activation admin application if those areas become independently deployed products.
