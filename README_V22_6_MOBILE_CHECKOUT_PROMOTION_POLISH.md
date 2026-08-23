# NAGMEENA V22.6 — Mobile Checkout + Promotion Polish

Built directly on V22.5.

- Removed browser geolocation/current-location checkout flow.
- Replaced large address textarea with Address Line 1, Address Line 2, and optional Landmark.
- PIN -> city/state lookup remains, with manual fallback.
- Payment screenshot is optimized and uploaded immediately after selection, before WhatsApp.
- ImageKit mobile upload retries the same proof up to 3 times and the proof-complete call up to 4 times.
- Final Confirm & Submit sends only JSON because proof is already saved.
- More Info uses the same cart quantity/stock controls as the main product card.
- Festival poster admin shows selected-image preview and a Preview Popup modal.
- Storefront promotion session key includes updated_at so an edited campaign can display again.
- Confirmation email adds NAGMEENA WhatsApp support with order-prefilled help message.
- No new Supabase migration is required beyond the V22.4 migration already applied.
