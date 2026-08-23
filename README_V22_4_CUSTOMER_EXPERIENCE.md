# NAGMEENA V22.4 — Customer Experience + Promotion + Confirmation Email

Base: V22.3 checkout-responsive-polish. Existing V22.2 direct browser -> ImageKit payment-proof upload is preserved.

## Included
- My Orders redesigned into Current Orders + Previous Orders.
- Continue Shopping CTA added to My Orders.
- Order cards show products, quantity, status, date and total.
- Checkout PIN lookup fills city/state automatically.
- City field can suggest postal areas/PINs; customer chooses the correct PIN when multiple are possible.
- Optional "Use current location" button asks browser permission only after the customer taps it, then prefills available address fields.
- Manual address entry always remains available.
- Indian mobile number validation: valid 10-digit number, client + server.
- Admin-managed festival/discount homepage poster:
  - image upload
  - enable/disable
  - optional start/end date
  - CTA text/link
  - 3–15 second duration (default 6)
  - once per browser session
  - instant close button
- More Info modal: Buy Now moved below price and Add to Cart added beside it. Main product card is otherwise unchanged.
- Footer WhatsApp CTA removed; Browse Collection upgraded to a glass/gold highlighted CTA.
- Order status/confirmation page adds NAGMEENA logo and brand-aligned presentation.
- Automatic confirmation email after Admin accepts an order:
  - email is optional
  - blank email never blocks confirmation
  - email failure never rolls back confirmation
  - email sent timestamp prevents normal duplicate sends
  - Accepted order cards show Email sent / not provided / pending
  - Retry Email is available when a customer provided email but sending failed/not configured

## Required Supabase migration
Run:
supabase/migrations/2026-08-29-v22-4-promotions-email.sql

This creates site_promotions and adds:
- orders.confirmation_email_sent_at
- orders.confirmation_email_last_error

## Email setup
Recommended provider: Resend.
Do NOT paste the API key into source code.

Vercel environment variables:
RESEND_API_KEY=...
ORDER_EMAIL_FROM=NAGMEENA <orders@your-verified-domain.com>

NEXT_PUBLIC_SITE_URL should already point to the production website.

If the customer leaves Email blank, the order confirms normally and email is skipped.

## Location lookup
- PIN/city lookup uses India Post's public postal lookup service.
- "Use current location" uses the browser Geolocation API only after explicit customer action.
- Reverse geocoding is performed through the server and has a manual-entry fallback.
- A draggable map picker is intentionally not bundled in this build. A reliable production map picker should use a chosen maps provider/API key rather than introducing a fragile map dependency into checkout.
