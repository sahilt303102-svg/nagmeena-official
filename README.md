# NAGMEENA Dynamic Catalog

This version keeps the existing NAGMEENA frontend design and moves catalog content to Supabase + ImageKit.

## What changed

- Product cards are driven by Supabase.
- Product details include optional Print fields.
- Public catalog has one continuous collection with infinite-scroll loading; there are no Batch/category tabs.
- The old category table is retained only for backward compatibility; the admin UI no longer manages or requires categories.
- Admin login uses Supabase email/password.
- Product create/edit/delete works through secure server routes.
- Product images upload to ImageKit from the admin panel.
- All 3 hero slides can be updated from the admin panel, with separate desktop/mobile images.
- Buy Now is intentionally not implemented yet.

## Environment

Copy `.env.example` to `.env.local` and fill:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` (server-only)
- `ADMIN_EMAILS`
- `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT`
- `IMAGEKIT_PUBLIC_KEY`
- `IMAGEKIT_PRIVATE_KEY` (server-only)

Never commit `.env.local`.

## Database

Run the complete `supabase/schema.sql` in Supabase SQL Editor. It is designed to be rerunnable and includes the v2 migration for nullable categories, public read policies, and the 3 dynamic hero slides.

## Local setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000/admin` and sign in with the Supabase Auth user whose email is listed in `ADMIN_EMAILS`.

## Image migration

After ImageKit is configured, run:

```bash
npm run migrate:images
```

This migrates the existing local product images to ImageKit. New product and hero uploads are handled from the admin panel.

## Manual UPI order workflow (new)

Run `supabase/migrations/2026-08-17-orders.sql` once in Supabase SQL Editor after the existing product/hero migrations. This creates the order table used for temporary manual UPI checkout and admin verification.

Required server environment variables remain:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `ADMIN_EMAILS`
- `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT`
- `IMAGEKIT_PUBLIC_KEY`
- `IMAGEKIT_PRIVATE_KEY`

The customer flow creates one 30-minute order session, locks the current product price, rechecks stock at order creation, requires only name + contact, accepts an optional payment screenshot/UTR, and moves the order to `verification_pending` only after proof is uploaded. The WhatsApp action is enabled only after that submission. Mobile devices can share the screenshot with the prepared WhatsApp message when supported; desktop opens WhatsApp with the prepared message and asks the customer to attach the screenshot manually.

The temporary acknowledgement is intentionally labeled **Payment Verification Slip** and is printable/savable as PDF. It is not a final invoice.

## V12 order/cart migration
After the existing order migration, run `supabase/migrations/2026-08-18-v12-orders.sql` to create `public.order_items`. Google Auth is not used. WhatsApp works immediately through customer-initiated `wa.me`; automatic owner notifications are optional and disabled until Meta credentials are supplied.
