# NAGMEENA V22.8 — Full Edit Restore + Smart Suggestions

- Built directly on V22.7.
- Edit now fetches a fresh, complete product from the admin API before filling the form.
- Upper, Bottom and Dupatta existing values are restored instead of relying on summary-card data.
- Handles Supabase embedded specification data whether returned as an object or array.
- Fabric/work/print/length fields use live suggestions learned from existing products.
- Suggestions use contains matching, rank prefix matches first, remove case-insensitive duplicates, and never prevent a new value.
- Card Fabric and Card Work use the same smart suggestion experience.
- No database migration is required.
