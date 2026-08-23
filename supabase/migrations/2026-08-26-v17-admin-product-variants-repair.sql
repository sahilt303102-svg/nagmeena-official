-- NAGMEENA V17
-- Admin product/variant reliability repair + single-source variant inventory.
-- Safe to run after V16. Most statements are idempotent.

create extension if not exists pgcrypto;

-- Category was removed from the admin/catalog flow. Older databases may still require it,
-- which causes POST /api/admin/products to fail with HTTP 500/400 on new products.
alter table if exists public.products alter column category_id drop not null;
alter table if exists public.products add column if not exists stock_quantity integer not null default 0;
alter table if exists public.products add column if not exists color text;
alter table if exists public.products add column if not exists display_order integer;

-- Ensure colour variants exist even on databases that missed the V15 migration.
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  color text not null,
  product_code text not null,
  custom_code text not null,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  is_primary boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists product_variants_product_code_unique on public.product_variants(lower(product_code));
create unique index if not exists product_variants_custom_code_unique on public.product_variants(custom_code);
create unique index if not exists product_variants_color_per_product_unique on public.product_variants(product_id, lower(color));
create unique index if not exists product_variants_one_primary_per_product on public.product_variants(product_id) where is_primary and is_active;
create index if not exists product_variants_product_idx on public.product_variants(product_id, is_active);

grant select on public.product_variants to anon, authenticated;
alter table public.product_variants enable row level security;
drop policy if exists "Public can read active product variants" on public.product_variants;
create policy "Public can read active product variants" on public.product_variants
for select to anon, authenticated using (is_active = true);

-- Keep order snapshots linked to the exact colour where available.
alter table if exists public.order_items add column if not exists variant_id uuid references public.product_variants(id) on delete set null;
alter table if exists public.order_items add column if not exists variant_product_code text;
alter table if exists public.order_items add column if not exists variant_custom_code text;
alter table if exists public.order_items add column if not exists variant_color text;

-- Reliable server-generated NAG-Pxxx base code.
create sequence if not exists public.nagmeena_product_code_seq;
do $$
declare m bigint;
begin
  select coalesce(max((regexp_match(product_code, '^NAG-P([0-9]+)$'))[1]::bigint), 0)
    into m
    from public.products
   where product_code ~ '^NAG-P[0-9]+$';
  perform setval('public.nagmeena_product_code_seq', greatest(m, 1), m > 0);
end $$;

create or replace function public.nagmeena_next_product_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare n bigint;
begin
  n := nextval('public.nagmeena_product_code_seq');
  return 'NAG-P' || lpad(n::text, 3, '0');
end $$;

revoke all on function public.nagmeena_next_product_code() from public;
grant execute on function public.nagmeena_next_product_code() to service_role;

-- Quantity is the source of truth. Parent product availability is calculated from active variants.
create or replace function public.nagmeena_variant_stock_status(q integer)
returns text language sql immutable as $$
  select case when coalesce(q,0) <= 0 then 'out_of_stock'
              when q <= 2 then 'low_stock'
              else 'in_stock' end
$$;

create or replace function public.nagmeena_sync_parent_from_variants(p_product_id uuid)
returns void language plpgsql as $$
declare
  active_count integer;
  total_qty integer;
begin
  select count(*), coalesce(sum(stock_quantity),0)
    into active_count, total_qty
    from public.product_variants
   where product_id = p_product_id and is_active;

  if active_count > 0 then
    update public.products
       set stock_quantity = total_qty,
           stock_status = public.nagmeena_variant_stock_status(total_qty)::public.stock_status,
           color = coalesce(
             (select color from public.product_variants where product_id=p_product_id and is_active and is_primary limit 1),
             (select color from public.product_variants where product_id=p_product_id and is_active order by created_at asc limit 1),
             color
           )
     where id = p_product_id;
  end if;
end $$;

-- V15 had an unnecessary parent sync in the BEFORE trigger. Keep BEFORE only for sanitizing/touching.
create or replace function public.nagmeena_variant_touch_before()
returns trigger language plpgsql as $$
begin
  new.stock_quantity := greatest(coalesce(new.stock_quantity,0),0);
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists nagmeena_product_variants_touch on public.product_variants;
create trigger nagmeena_product_variants_touch
before insert or update on public.product_variants
for each row execute function public.nagmeena_variant_touch_before();

create or replace function public.nagmeena_sync_variant_parent_after()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    perform public.nagmeena_sync_parent_from_variants(old.product_id);
    return old;
  end if;
  perform public.nagmeena_sync_parent_from_variants(new.product_id);
  return new;
end $$;

drop trigger if exists nagmeena_product_variants_parent_sync on public.product_variants;
create trigger nagmeena_product_variants_parent_sync
after insert or update or delete on public.product_variants
for each row execute function public.nagmeena_sync_variant_parent_after();

-- Repair current parent totals/statuses.
do $$
declare r record;
begin
  for r in select distinct product_id from public.product_variants loop
    perform public.nagmeena_sync_parent_from_variants(r.product_id);
  end loop;
end $$;

notify pgrst, 'reload schema';
