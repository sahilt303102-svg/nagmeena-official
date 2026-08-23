-- NAGMEENA V12.3: production-safe order lifecycle / checkout idempotency.
-- Run after the existing orders + order_items migrations.

alter table public.orders add column if not exists idempotency_key text;
create unique index if not exists orders_idempotency_key_uidx on public.orders(idempotency_key) where idempotency_key is not null;
create index if not exists orders_active_product_idx on public.orders(product_code, status, expires_at);
create index if not exists orders_token_status_idx on public.orders(public_token, status);

-- Existing active rows that have already passed their deadline are no longer active.
update public.orders set status='expired', updated_at=now()
where status='payment_pending' and expires_at <= now();

notify pgrst, 'reload schema';

-- Compatibility repair for databases where order_items existed before image_url was added.
alter table public.order_items add column if not exists image_url text;
notify pgrst, 'reload schema';

-- Global product checkout locks are intentionally not created.
-- Different customers may start independent payment sessions for the same product.

notify pgrst, 'reload schema';
