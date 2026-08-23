# NAGMEENA V14 Final Update

## Required database step (IMPORTANT)
Open **Supabase → SQL Editor** and run exactly:

`supabase/migrations/2026-08-23-v14-inventory-and-order-reliability.sql`

Run it once after your previous V13 migration. This version requires it because it adds `stock_quantity`, safe inventory reservation/restoration, and return handling.

## What changed
- Cart checkout no longer initializes before browser cart storage is ready.
- Checkout uses a persistent idempotency key and retry/timeout handling to reduce `Failed to fetch` / duplicate-order problems.
- Confirmed/rejected/expired orders do not block buying the same product again.
- Pending/confirmed order status strip is shown until the confirmed receipt is printed; after printing it dismisses after 20 seconds.
- Continue Shopping on order status page.
- Print Status renamed to Print Receipt; old invoice section removed.
- Add-to-cart notification.
- Fabric/Work dropdowns close on outside click and render above cards.
- Product image navigation moved to the bottom on desktop.
- More Info image uses the same 4:5 product-card proportion.
- Product colors can be entered comma-separated in Admin and selected on the card.
- Clipboard copy has a fallback for older/insecure browser contexts.
- Admin inventory quantity automatically controls stock state: 0 Out of Stock, 1–2 Low Stock, 3+ In Stock.
- Stock is reserved only when a completed payment proof is submitted.
- Reject restores reserved stock.
- Confirmed orders can be returned with Restock or Do Not Restock.
- Admin orders now have search by customer name, number, order ID and product code, plus product thumbnails.

## After replacing files
1. Run the V14 SQL migration above.
2. Keep your existing `.env.local` values.
3. Run `npm install` (or `npm ci`) and then `npm run dev`.
4. Test one complete order lifecycle:
   Add to Cart → Checkout → Proof → WhatsApp → Submit → Upcoming → Accept → Frontend Confirmed → Print Receipt.
