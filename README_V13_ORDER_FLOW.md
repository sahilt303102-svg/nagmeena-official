# NAGMEENA V13 — Final order-flow repair

## Required once for an existing Supabase database
Open **Supabase → SQL Editor**, paste and run:

`supabase/migrations/2026-08-22-v13-order-flow-repair.sql`

This is the important repair for the previous checkout bugs:
- removes the old global per-product active-order lock;
- keeps idempotency only for the same browser checkout session;
- expires abandoned payment sessions safely;
- keeps legacy `order_items` databases compatible;
- reloads the PostgREST schema cache.

## Updated flow
1. Customer clicks Buy Now or checks out from Cart.
2. Existing valid session is resumed; expired/cancelled sessions are discarded and a fresh order can start.
3. No other customer's active session can block the same product.
4. Customer pays by UPI / QR.
5. Customer uploads payment proof.
6. Customer clicks the WhatsApp order-notification button; a pre-filled message opens to NAGMEENA.
7. Customer submits verification.
8. Only fully submitted orders appear in Admin → Upcoming.
9. Admin can Accept or Reject.
10. Confirmed orders update the customer status page and the storefront order-status strip.

## Important environment variables
Keep your existing Supabase and ImageKit variables. WhatsApp Cloud API variables remain optional; the pre-filled `wa.me` fallback works without them.
