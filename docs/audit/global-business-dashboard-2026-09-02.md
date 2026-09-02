# ALJAVA Global vs Business Dashboard Audit — 2026-09-02

## Architecture
- `/dashboard.html` is the compatibility entry point for the Global Platform Dashboard.
- `/platform-dashboard.html` is the Super Admin Global Dashboard.
- `/business-hub.html` remains the Business Hub / management surface.
- `/business-dashboard.html?business_unit_id=<uuid>` is the tenant-scoped Business Dashboard.
- Login routing now sends Super Admin to Global Dashboard and business users to an active business dashboard.

## Existing schema reused
No database migration was required for this dashboard architecture.
Existing tenant key is `business_unit_id` on Products, Cards, Transactions, Subscriptions, Sales, CardScans, Projects, Finance Entries, Project Tasks, Customer Pipeline, and Business Activity Logs. Existing RLS remains enabled.

`Customers` remains a global master table in the current architecture and has no `business_unit_id`. Business-dashboard customer KPI therefore derives distinct customer IDs from business-scoped transaction, card, subscription, pipeline, and project references. No database schema change was introduced.

## Global Dashboard
Uses the existing Super Admin `get_platform_overview` RPC for platform KPI values and performs additional read-only queries for business performance, global transaction detail, charts, activity, and health checks.

## Business Dashboard isolation
All operational dashboard queries are filtered by the active `business_unit_id`. The URL parameter is accepted only when it matches a business returned by `get_my_business_units()`. RLS remains the backend enforcement boundary.

## Integrity validation
A live database audit returned zero cross-business references for:
- Cards → Product
- Transactions → Product
- Transactions → Cards
- CardScans → Cards
- Finance Entries → Projects
- Project Tasks → Projects
- Customer Pipeline → Projects

A live audit also returned zero missing `business_unit_id` values for the tenant-scoped operational tables checked.

## Deployment verification
The latest dashboard code is committed to GitHub `main`. A fresh production deployment is required so the public Vercel alias serves that latest `main` revision. This commit intentionally changes only this audit documentation to trigger the existing Git-to-Vercel deployment pipeline; no application logic or database behavior is changed.

## REVIEW REQUIRED
Interactive browser/device testing is still required for desktop/tablet/mobile, navigation, chart rendering, and real user-role scenarios. Vercel runtime logs may remain unavailable if the platform returns 403 for the project log endpoint.

No RLS, policy, RPC, authentication mechanism, schema, or production data was changed for this dashboard architecture.
