# NAGMEENA V20 — UI State + Variant Cart Polish

This build is based on V19 and does not require a new Supabase migration.

## Changes
- Navbar cart badge now reads the active V15 cart store and updates immediately through the shared cart-change event (plus storage sync for another tab).
- Cart badge represents total cart quantity, not distinct product lines.
- Product-card quantity controls enforce the currently selected colour variant's exact available quantity and disable + at the maximum.
- Product card details were reorganized into a cleaner hierarchy without removing product code, custom code, price, fabric, work, colour, stock or variant availability.
- Order-confirmed celebration redesigned to NAGMEENA glass language: restrained frosted glass, emerald/gold accents, no confetti/party graphics.
- Confirmation screen remains for ~4 seconds, then the confirmed status strip remains for ~15 seconds.
- Status strip upgraded with a lighter futuristic glass treatment using the existing brand palette.
- Returning-customer confirmation behavior remains token-scoped: only the browser holding that order's secure token can see the notification.

## Validation
- TypeScript/TSX transpilation syntax pass completed across app/components/lib.
- No database changes in V20.
