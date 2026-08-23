-- NAGMEENA V19
-- Inventory type-safety hardening + full parent/variant stock resync.
-- Safe to run after V18. Safe to run more than once.
--
-- Root cause addressed:
-- Some older trigger/function paths produced TEXT while products.stock_status is
-- the PostgreSQL enum public.stock_status. V19 introduces one enum-returning helper
-- and routes every quantity-driven stock assignment through it.

create or replace function public.nagmeena_stock_status_for_quantity(q integer)
returns public.stock_status
language sql
immutable
as $$
  select (
    case
      when coalesce(q, 0) <= 0 then 'out_of_stock'
      when q <= 2 then 'low_stock'
      else 'in_stock'
    end
  )::public.stock_status
$$;

-- Product-level fallback/legacy inventory trigger. Variant products also pass
-- through this safely when their parent total is synchronized.
create or replace function public.nagmeena_sync_product_stock_status()
returns trigger
language plpgsql
as $$
begin
  new.stock_quantity := greatest(coalesce(new.stock_quantity, 0), 0);
  new.stock_status := public.nagmeena_stock_status_for_quantity(new.stock_quantity);
  return new;
end
$$;

drop trigger if exists nagmeena_products_stock_sync on public.products;
create trigger nagmeena_products_stock_sync
before insert or update of stock_quantity on public.products
for each row execute function public.nagmeena_sync_product_stock_status();

-- Variant parent synchronization uses the enum helper directly, so no TEXT -> enum
-- assignment exists anywhere in the live synchronization path.
create or replace function public.nagmeena_sync_parent_from_variants(p_product_id uuid)
returns void
language plpgsql
as $$
declare
  active_count integer;
  total_qty integer;
begin
  select count(*), coalesce(sum(stock_quantity), 0)
    into active_count, total_qty
    from public.product_variants
   where product_id = p_product_id
     and is_active;

  if active_count > 0 then
    update public.products
       set stock_quantity = total_qty,
           stock_status = public.nagmeena_stock_status_for_quantity(total_qty),
           color = coalesce(
             (select color from public.product_variants where product_id = p_product_id and is_active and is_primary limit 1),
             (select color from public.product_variants where product_id = p_product_id and is_active order by created_at asc limit 1),
             color
           )
     where id = p_product_id;
  end if;
end
$$;

-- Keep variant quantities sane before every insert/update.
create or replace function public.nagmeena_variant_touch_before()
returns trigger
language plpgsql
as $$
begin
  new.stock_quantity := greatest(coalesce(new.stock_quantity, 0), 0);
  new.updated_at := now();
  return new;
end
$$;

drop trigger if exists nagmeena_product_variants_touch on public.product_variants;
create trigger nagmeena_product_variants_touch
before insert or update on public.product_variants
for each row execute function public.nagmeena_variant_touch_before();

create or replace function public.nagmeena_sync_variant_parent_after()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform public.nagmeena_sync_parent_from_variants(old.product_id);
    return old;
  end if;
  perform public.nagmeena_sync_parent_from_variants(new.product_id);
  return new;
end
$$;

drop trigger if exists nagmeena_product_variants_parent_sync on public.product_variants;
create trigger nagmeena_product_variants_parent_sync
after insert or update or delete on public.product_variants
for each row execute function public.nagmeena_sync_variant_parent_after();

-- Recalculate every current product. Products with active variants derive stock
-- from those variants; legacy products derive status directly from their quantity.
do $$
declare
  r record;
begin
  for r in select distinct product_id from public.product_variants where is_active loop
    perform public.nagmeena_sync_parent_from_variants(r.product_id);
  end loop;

  update public.products p
     set stock_quantity = greatest(coalesce(p.stock_quantity, 0), 0)
   where not exists (
     select 1 from public.product_variants v
      where v.product_id = p.id and v.is_active
   );
end
$$;

notify pgrst, 'reload schema';
