# NAGMEENA V12.3 — Production Order Lifecycle

## Required database migration
Run this in Supabase SQL Editor after the existing order/order_items migrations:

`supabase/migrations/2026-08-21-v12-3-order-lifecycle.sql`

This adds the checkout idempotency key and expires old payment sessions.

## Order lifecycle
- `payment_pending`: checkout created, payment not submitted.
- `verification_pending`: proof submitted; waiting for admin verification.
- `verified`: payment accepted by admin; awaiting final confirmation.
- `confirmed`: final order confirmed; customer may buy the same product again.
- `cancelled`: abandoned/rejected order; customer may start a new order.
- `expired`: payment window ended; customer may start a new order.

## Important production checks
1. Never put Supabase secret key or ImageKit private key in `NEXT_PUBLIC_*` variables.
2. Use the deployed HTTPS domain for production checkout testing.
3. Add the production domain to any relevant ImageKit/Supabase settings.
4. Verify the UPI ID and QR before going live.
5. Test a real small-value payment before launch.
6. Verify admin confirmation changes the customer Payment Status page to green.
7. Test the same product twice: second checkout must be allowed after confirmation/cancellation/expiry.
8. Test an abandoned checkout for 30+ minutes: it must become expired and no longer block a new order.
9. Test deleting/cancelling an order in Admin: the buyer's stale browser session must recover instead of showing a database error.
10. Keep the Meta WhatsApp API disabled until its credentials are configured. The customer `wa.me` fallback works without those credentials.
