# NAGMEENA V12 setup

## 1. Environment
Copy `.env.example` to `.env.local` and keep all existing Supabase/ImageKit values from your current deployment.

Required server values include:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- ImageKit values already used by the project

WhatsApp is optional. Keep `WHATSAPP_ENABLED=false` until Meta Cloud API is configured.
When configured, add `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_ACCESS_TOKEN`, and `WHATSAPP_ADMIN_PHONE` (international digits only, no +).

## 2. Supabase migrations
Run the existing order migration first if you have not already:
`supabase/migrations/2026-08-17-orders.sql`

Then run:
`supabase/migrations/2026-08-18-v12-orders.sql`

The second migration creates `public.order_items` for multi-suit carts.

## 3. Test order flow
1. Open a product and use **Add to Cart** or **Buy Now**.
2. Open Cart and check quantities.
3. Continue to payment.
4. Step 1 shows product image(s) and total.
5. Step 2 supports UPI intent on mobile and QR on desktop.
6. Copy the UPI ID and verify the copied toast.
7. Step 3 requires name, contact, screenshot and the payment confirmation checkbox.
8. Submit redirects to `/payment-status?token=...`.
9. Status page polls until Admin verifies/confirms.
10. After confirmation, final invoice becomes available.
11. WhatsApp support remains available through `wa.me` without any API key.

## 4. Admin
Default Orders view shows completed/verified orders. Use **Needs verification** for new payment submissions. Select orders with checkboxes and delete after confirmation. Use **View more** when more than four records exist.

## 5. Important local-network testing note
For phone testing on a laptop development server, the phone must be able to reach the laptop's LAN IP and the dev server must bind to the LAN interface. For final payment testing, use the deployed Vercel URL. Do not put `localhost` or `127.0.0.1` into public environment variables.

## 6. WhatsApp fallback
Without Meta API credentials, customers can still use the WhatsApp buttons. They open `wa.me` with a pre-filled order/support message. Automatic server-to-owner WhatsApp notification activates only after the Meta variables are configured and `WHATSAPP_ENABLED=true`.


## V12.1 reliability migration

If checkout shows an order-finalization/database error, run this migration after the orders migration:

`supabase/migrations/2026-08-19-v12-1-order-items.sql`

It safely creates `public.order_items` if needed and asks PostgREST to reload its schema cache.

## Important checkout behavior

- `payment_pending` and `verification_pending` orders prevent a duplicate checkout for the same product.
- `verified` and `confirmed` orders do not block a new purchase.
- If an active order already exists, Buy Now redirects the customer to that order's Payment Status page instead of showing a confusing duplicate-order error.
- The Cart button is now placed directly beside Admin in the main navbar.
- The Payment Status page includes a WhatsApp action with the order/customer/payment-reference details pre-filled.
