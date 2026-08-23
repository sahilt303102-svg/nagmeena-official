-- NAGMEENA manual UPI order workflow.
-- Run this once in Supabase SQL Editor after your existing v3 migration.

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  public_token text not null unique,
  product_id uuid references public.products(id) on delete set null,
  product_code text not null,
  product_name text not null,
  amount numeric(12,2) not null check (amount >= 0),
  status text not null default 'payment_pending' check (status in ('payment_pending','verification_pending','verified','confirmed','cancelled','expired')),
  payment_method text not null default 'UPI',
  customer_name text,
  customer_phone text,
  customer_email text,
  address text,
  city text,
  state text,
  pincode text,
  payment_reference text,
  proof_url text,
  proof_path text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  submitted_at timestamptz,
  verified_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists orders_public_token_idx on public.orders(public_token);

alter table public.orders enable row level security;

-- Browser never accesses this table directly. Next.js server routes use SUPABASE_SECRET_KEY.
drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();
