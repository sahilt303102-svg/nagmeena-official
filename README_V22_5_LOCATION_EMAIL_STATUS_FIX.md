# NAGMEENA V22.5 — Location, email diagnostics and rejected-order UX

Built on V22.4 customer experience.

Fixes:
- Mobile geolocation fails gracefully on insecure LAN localhost URLs instead of breaking checkout.
- Current location remains optional and manual entry is always available.
- PIN -> city/state lookup is retained and city lookup now falls back to Nominatim when India Post post-office search is incomplete.
- State is auto-filled from PIN/location; if lookup fails it becomes manually editable.
- Indian mobile number is normalized and warns after blur when it is not a valid 10-digit number.
- Rejected orders now receive a 4-second customer status screen and a temporary 15-second rejected strip, matching confirmed behavior.
- Admin displays the actual Resend error returned by the server and keeps Retry Email.
- No new Supabase migration is required beyond the V22.4 migration already applied.

Local email test:
NEXT_PUBLIC_SITE_URL=http://localhost:3000
RESEND_API_KEY=re_...
ORDER_EMAIL_FROM="NAGMEENA <orders@nagmeena.com>"

Mobile geolocation note:
Accessing the dev server from a phone as http://192.168.x.x:3000 is an insecure browser context, so geolocation is normally blocked. Manual address entry remains available; use an HTTPS dev URL/tunnel to test mobile geolocation. Production https://nagmeena.com supports it.
