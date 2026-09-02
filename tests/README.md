# ALJAVA authorization regression

This directory defines the authorization baseline for ALJAVA. The matrix follows the actor-resource-action model and is intended to prevent authorization regressions as the application evolves.

## Actors

- `anonymous`
- `authenticated_non_admin`
- `authenticated_admin`

## Required checks

1. Anonymous users cannot access the admin dashboard or admin data.
2. Authenticated non-admin users cannot access admin data or admin RPCs.
3. Admin users can perform the documented admin operations.
4. Privileged RPCs remain non-callable directly by anonymous/non-admin clients.
5. Logout must terminate dashboard access.
6. Public card activation remains available without exposing admin data.

The JSON matrix is the machine-readable baseline. Production write-path tests must use controlled test data and must not reset or delete production business data.
