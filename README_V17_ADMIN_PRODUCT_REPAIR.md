# NAGMEENA V17 — Admin Product + Variant Repair

Run this migration once in Supabase SQL Editor before testing new/edit product:

`supabase/migrations/2026-08-26-v17-admin-product-variants-repair.sql`

## Important behavior
- Basic Information no longer has a second quantity field.
- Quantity is controlled only per colour variant.
- New products require at least one colour variant.
- The site generates the base `NAG-Pxxx` code and each `NAG-Pxxx-COLOR` code automatically.
- Admin enters only colour, custom numeric code, and quantity.
- Quantity 0 = Out of Stock; 1–2 = Low Stock; 3+ = In Stock.
- Product parent quantity/status is synchronized from active variants.
- The migration also removes the old category NOT NULL constraint that can break new-product POST requests on older databases.
- WhatsApp and final manual-verification submission are separate again to avoid browser popup/navigation race conditions.
