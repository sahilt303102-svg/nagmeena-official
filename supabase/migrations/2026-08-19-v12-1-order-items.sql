-- NAGMEENA V12.1: order_items reliability migration
-- Run after 2026-08-17-orders.sql. Safe to run even if order_items already exists.

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_code text not null,
  product_name text not null,
  image_url text,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  line_total numeric(12,2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists order_items_product_code_idx on public.order_items(product_code);

alter table public.order_items enable row level security;

-- Force PostgREST to reload its schema cache after the table is created.
notify pgrst, 'reload schema';
