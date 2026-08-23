# NAGMEENA V22 — Production SEO Ready

## New environment variable
Set `NEXT_PUBLIC_SITE_URL` to your final production domain, e.g. `https://www.nagmeena.com`.
For the initial Vercel test deployment you may set it to your production Vercel URL, then change it after connecting the custom domain and redeploy.

## Included SEO work
- canonical URL / metadataBase
- stronger title, description, Open Graph and Twitter metadata
- robots.txt via Next.js Metadata Route
- dynamic sitemap.xml including live product URLs
- indexable `/product/[code]` pages
- Product structured data on product pages
- Organization / Store structured data on homepage
- `noindex, nofollow` layouts for admin, cart, orders, payment and checkout pages
- product images included in sitemap when available

## After deployment
1. Confirm `/robots.txt` and `/sitemap.xml` load on the public domain.
2. Add the final domain to Google Search Console.
3. Submit `/sitemap.xml`.
4. Inspect the homepage and a few `/product/NAG-Pxxx` URLs in Search Console and request indexing.
5. Keep private order/payment links out of public navigation and never share server secrets.
