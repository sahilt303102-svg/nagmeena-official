# NAGMEENA V22.8.1 — Null-safe Admin Edit hotfix

Built on V22.8.

Fixes the runtime crash when older Supabase products contain NULL optional specification values.

Changes:
- Smart suggestion inputs accept null/undefined safely.
- Full edit specifications are normalized to strings before reaching React form state.
- Variant/card fields are normalized during edit.
- Save payload is null-safe for all optional specification fields.
- No database migration required.
