# NAGMEENA V18 – stock-status 42804 repair

## Root cause
`products.stock_status` is the PostgreSQL enum `public.stock_status`. The helper `nagmeena_variant_stock_status()` returns text. V17 assigned that text expression directly to the enum inside the parent-stock sync function, so PostgreSQL returned `42804` while saving a variant.

## Required migration
If V17 is already installed, run only:

`supabase/migrations/2026-08-27-v18-stock-status-enum-repair.sql`

The repair explicitly casts the helper result to `public.stock_status`, recreates the parent sync function, recalculates current parent inventory/status, and reloads the PostgREST schema. It is safe to run more than once.

V15/V17 migration files in this ZIP are also corrected for fresh installations.
