# NAGMEENA V22.2 — Direct Mobile Payment Proof Upload

Root-cause repair:
- Payment screenshots no longer travel through a Vercel Function.
- Browser requests a short-lived ImageKit signature from `/api/orders/proof-auth`.
- Browser uploads the screenshot directly to ImageKit.
- Browser then sends only the resulting ImageKit URL to `/api/orders/proof-complete`.
- Final order submission remains idempotent and unchanged.
- Existing `/api/orders/proof` is retained only for backward compatibility.
- No Supabase migration is required.

Why:
Vercel Functions enforce request-body limits and introduce an unnecessary second
network hop for uploads. This is especially fragile on mobile connections.
ImageKit officially supports authenticated client-side uploads, so direct upload
is the correct production architecture for this flow.
