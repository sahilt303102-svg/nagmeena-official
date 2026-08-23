# NAGMEENA V22.3 — Checkout + Responsive Polish

Base: V22.2 direct mobile proof upload.

- Step 1: product review + delivery form + server-calculated delivery pricing.
- Greater Noida configured PINs: free delivery; all other valid PINs: ₹100 once per order.
- Step 2: same UPI/QR flow with clearer final total.
- Step 3: screenshot -> checkbox -> WhatsApp -> Confirm & Submit.
- V22.2 browser-to-ImageKit direct proof upload is retained.
- Fabric/Work filters no longer overlap each other or product cards.
- Admin order cards are responsive on mobile.
- Confirmation screen and order strip use NAGMEENA emerald/gold/base colors.
- Status receipt shows subtotal, delivery and total.
- No Supabase migration required.

Vercel env (optional override):
NEXT_PUBLIC_FREE_DELIVERY_PINCODES=201304,201305,201306,201308,201309,201310,201311,201312,201314,201318
