# NAGMEENA V15 — Colour variants + inventory

## Required database step
Run `supabase/migrations/2026-08-24-v15-product-variants.sql` in Supabase SQL Editor after the V14 migration.

## Variant model
Each colour can have:
- Colour name
- Variant Product Code, e.g. `NAG-P003-RED`
- Custom numeric code, e.g. `0000-1111-2222-0000-3333`
- Separate quantity
- One primary colour

The primary colour is selected by default on the public product card. Stock is checked per selected variant in the product card, cart, checkout, submission, rejection and return/restock flow.

## Stock rules
- 0 = Out of Stock
- 1–2 = Low Stock
- 3+ = In Stock
- Parent product stock is calculated from active variants when variants exist.
- Legacy products without variants continue using the product-level quantity.

## Production checklist
1. Run the V15 SQL migration.
2. Restart Next.js.
3. Edit one product and add at least two colour variants.
4. Verify each Product Code and Custom Code is unique.
5. Test a zero-stock colour: it must be disabled.
6. Add an in-stock colour to cart and use +/− controls.
7. Ensure + cannot exceed that colour's quantity.
8. Complete a test order and verify the exact colour/codes appear in Admin.
9. Reject the order and confirm the exact colour stock restores.
10. Confirm another order and test Return → Restock for that exact colour.
