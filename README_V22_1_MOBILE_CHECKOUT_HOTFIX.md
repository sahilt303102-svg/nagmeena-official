# NAGMEENA V22.1 Mobile Checkout Hotfix

Changes:
- Compresses large mobile payment screenshots before upload.
- Keeps proof uploads comfortably below Vercel request-body limits.
- Extends proof-upload timeout to 90 seconds for slower mobile networks.
- Uses a 30 second timeout for normal JSON submit calls.
- Keeps proof upload and final submit idempotent/retry-safe.
- Improves mobile interruption messaging.
- Includes the payment-status nullable token TypeScript build fix.
- No Supabase migration is required.
