NAGMEENA V13.1 CHECKOUT HOTFIX

Fix:
- Buy Now could remain forever on "Preparing your secure order…" in React/Next development Strict Mode.
- Cause: the first effect was cancelled by Strict Mode cleanup while a ref blocked the second effect, so no effect could finish and clear loading.
- Fix: removed the blocking ref. Both Strict Mode requests now use the same idempotency key, so the API safely reuses one order instead of creating duplicates.

No additional database migration is required for this hotfix if the V13 migration was already run.
