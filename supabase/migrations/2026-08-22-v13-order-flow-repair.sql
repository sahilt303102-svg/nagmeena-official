-- NAGMEENA V13: order-flow repair and legacy database compatibility.
-- Run this ONCE in Supabase SQL Editor after the previous order migrations.
-- It removes the old global product lock that caused "already in progress" for other customers.

drop index if exists public.orders_one_active_primary_product_uidx;

alter table public.orders add column if not exists idempotency_key text;
alter table public.orders add column if not exists updated_at timestamptz default now();
create unique index if not exists orders_idempotency_key_uidx
on public.orders(idempotency_key) where idempotency_key is not null;
create index if not exists orders_token_status_idx on public.orders(public_token,status);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_code text not null,
  product_name text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  line_total numeric(12,2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);
create index if not exists order_items_order_id_idx on public.order_items(order_id);

-- Expire abandoned payment sessions. Submitted orders are never auto-expired here.
update public.orders set status='expired', updated_at=now()
where status='payment_pending' and expires_at is not null and expires_at <= now();

notify pgrst, 'reload schema';
